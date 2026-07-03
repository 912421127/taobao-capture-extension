<template>
    <main class="dashboard">
        <header class="topbar">
            <div>
                <h1>商品数据分析</h1>
                <p>Taobao Capture Dashboard</p>
            </div>
            <a-space>
                <a-tag :color="healthStatus === 'online' ? 'success' : healthStatus === 'checking' ? 'processing' : 'error'">
                    {{ healthLabel }}
                </a-tag>
                <a-button size="small" :loading="loading" @click="refreshAll">
                    <template #icon>
                        <RedoOutlined />
                    </template>
                    刷新
                </a-button>
            </a-space>
        </header>

        <section class="toolbar">
            <a-input-search v-model:value="searchDraft" allow-clear enter-button="搜索" placeholder="商品 ID、标题、店铺" size="large" @search="handleSearch" />
        </section>

        <a-alert v-if="errorMessage" class="alert" type="error" show-icon :message="errorMessage" />

        <section class="metrics">
            <a-card v-for="metric in metrics" :key="metric.label" class="metric-card" :bordered="false">
                <span class="metric-label">{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
                <small>{{ metric.hint }}</small>
            </a-card>
        </section>

        <section class="content-grid">
            <a-card class="table-card" :bordered="false">
                <a-table
                    row-key="id"
                    :columns="columns"
                    :data-source="products"
                    :loading="loading"
                    :pagination="pagination"
                    :scroll="{ x: 980 }"
                    size="middle"
                    @change="handleTableChange"
                    :customRow="createRowHandlers"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'title'">
                            <div class="product-title">
                                <strong>{{ record.title || '未命名商品' }}</strong>
                                <span>{{ record.itemId }}</span>
                            </div>
                        </template>
                        <template v-else-if="column.key === 'platform'">
                            <a-tag :color="record.platform === 'tmall' ? 'red' : 'orange'">{{ record.platform }}</a-tag>
                        </template>
                        <template v-else-if="column.key === 'priceRange'">
                            {{ formatPriceRange(record.minPrice, record.maxPrice, record.finalPrice) }}
                        </template>
                        <template v-else-if="column.key === 'latestSnapshotAt'">
                            {{ formatDate(record.latestSnapshotAt) }}
                        </template>
                    </template>
                </a-table>
            </a-card>
        </section>

        <a-drawer v-model:open="detailOpen" width="720" :title="selectedDetail?.title || '商品详情'" destroy-on-close @after-open-change="handleDrawerAfterOpenChange">
            <a-spin :spinning="detailLoading">
                <template v-if="selectedDetail">
                    <div class="detail-head">
                        <div>
                            <a-tag :color="selectedDetail.platform === 'tmall' ? 'red' : 'orange'">{{ selectedDetail.platform }}</a-tag>
                            <span>{{ selectedDetail.itemId }}</span>
                        </div>
                        <a :href="selectedDetail.pageUrl" target="_blank" rel="noreferrer">打开商品页</a>
                    </div>

                    <div v-if="mainImages.length" class="image-strip">
                        <img v-for="image in mainImages" :key="image.id" :src="image.imageUrl" :alt="selectedDetail.title" />
                    </div>

                    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
                        <a-tab-pane key="skus" tab="SKU">
                            <a-table row-key="id" :columns="skuColumns" :data-source="selectedDetail.skus" :pagination="false" size="small" :customRow="createSkuRowHandlers" />
                        </a-tab-pane>
                        <a-tab-pane key="trend" tab="价格趋势">
                            <div class="chart-tools">
                                <a-select v-model:value="selectedSkuId" allow-clear placeholder="全部 SKU" style="width: 220px" @change="loadHistory">
                                    <a-select-option v-for="sku in selectedDetail.skus" :key="sku.skuId" :value="sku.skuId">
                                        {{ sku.specName || sku.skuId }}
                                    </a-select-option>
                                </a-select>
                            </div>
                            <div v-if="history.length" ref="chartRef" class="chart"></div>
                            <a-empty v-else description="暂无价格快照" />
                        </a-tab-pane>
                        <a-tab-pane key="images" tab="图片">
                            <div class="detail-images">
                                <img v-for="image in selectedDetail.images" :key="image.id" :src="image.imageUrl" :alt="image.imageType" />
                            </div>
                        </a-tab-pane>
                    </a-tabs>
                </template>
                <a-empty v-else description="请选择商品" />
            </a-spin>
        </a-drawer>
    </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import * as echarts from 'echarts';
import { RedoOutlined } from '@ant-design/icons-vue';
import {
    fetchHealth,
    fetchPriceHistory,
    fetchProductDetail,
    fetchProducts,
    fetchSummary,
    type AnalyticsSummary,
    type PriceHistoryPoint,
    type ProductDetail,
    type ProductListItem,
    type ProductSku
} from './api';

const loading = ref(false);
const detailLoading = ref(false);
const healthStatus = ref<'checking' | 'online' | 'offline'>('checking');
const errorMessage = ref('');
const searchDraft = ref('');
const search = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const summary = ref<AnalyticsSummary | null>(null);
const products = ref<ProductListItem[]>([]);
const detailOpen = ref(false);
const drawerReady = ref(false);
const selectedDetail = ref<ProductDetail | null>(null);
const selectedSkuId = ref<string | undefined>();
const history = ref<PriceHistoryPoint[]>([]);
const chartRef = ref<HTMLDivElement | null>(null);
const activeTab = ref('skus');
let chart: echarts.ECharts | null = null;

const columns = [
    { title: '商品', dataIndex: 'title', key: 'title', width: 320 },
    { title: '店铺', dataIndex: 'shopName', key: 'shopName', width: 180 },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 100 },
    { title: 'SKU', dataIndex: 'skuCount', key: 'skuCount', width: 90 },
    { title: '价格区间', key: 'priceRange', width: 150 },
    { title: '最近快照', dataIndex: 'latestSnapshotAt', key: 'latestSnapshotAt', width: 180 }
];

const skuColumns = [
    { title: '规格', dataIndex: 'specName', key: 'specName' },
    { title: 'SKU ID', dataIndex: 'skuId', key: 'skuId' },
    { title: '价格', dataIndex: 'skuPrice', key: 'skuPrice', customRender: ({ text }: { text: number }) => formatMoney(text) },
    { title: '库存', dataIndex: 'stockText', key: 'stockText' }
];

const healthLabel = computed(() => {
    if (healthStatus.value === 'online') return '后端在线';
    if (healthStatus.value === 'checking') return '连接中';
    return '后端离线';
});

const metrics = computed(() => [
    { label: '商品数', value: formatInteger(summary.value?.productCount), hint: 'captures' },
    { label: 'SKU 数', value: formatInteger(summary.value?.skuCount), hint: 'capture_skus' },
    { label: '价格快照', value: formatInteger(summary.value?.snapshotCount), hint: 'sku_price_snapshots' },
    {
        label: '价格范围',
        value: summary.value ? `${formatMoney(summary.value.minPrice)} - ${formatMoney(summary.value.maxPrice)}` : '-',
        hint: 'snapshot price'
    },
    { label: '最近快照', value: formatDate(summary.value?.latestSnapshotAt), hint: 'captured_at' }
]);

const pagination = computed<TablePaginationConfig>(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value
}));

const mainImages = computed(() => selectedDetail.value?.images.filter(image => image.imageType === 'main').slice(0, 5) || []);

onMounted(() => {
    refreshAll();
});

watch([history, activeTab], () => {
    if (activeTab.value === 'trend') {
        renderChart();
    }
});

async function refreshAll() {
    loading.value = true;
    errorMessage.value = '';
    healthStatus.value = 'checking';

    try {
        await fetchHealth();
        healthStatus.value = 'online';
        const [summaryResult, productResult] = await Promise.all([fetchSummary(), fetchProducts({ search: search.value, page: page.value, pageSize: pageSize.value })]);
        summary.value = summaryResult;
        products.value = productResult.items;
        total.value = productResult.total;
        page.value = productResult.page;
        pageSize.value = productResult.pageSize;
    } catch (error) {
        healthStatus.value = 'offline';
        errorMessage.value = error instanceof Error ? error.message : '加载失败';
    } finally {
        loading.value = false;
    }
}

function handleSearch(value: string) {
    search.value = value.trim();
    page.value = 1;
    refreshAll();
}

function handleTableChange(nextPagination: TablePaginationConfig) {
    page.value = Number(nextPagination.current || 1);
    pageSize.value = Number(nextPagination.pageSize || 20);
    refreshAll();
}

function createRowHandlers(record: ProductListItem) {
    return {
        onClick: () => openDetail(record.id)
    };
}

function createSkuRowHandlers(record: ProductSku) {
    return {
        onClick: () => {
            selectedSkuId.value = record.skuId;
            activeTab.value = 'trend';
            loadHistory();
        }
    };
}

async function openDetail(captureId: number) {
    detailOpen.value = true;
    drawerReady.value = false;
    detailLoading.value = true;
    selectedDetail.value = null;
    selectedSkuId.value = undefined;
    history.value = [];
    activeTab.value = 'skus';

    try {
        selectedDetail.value = await fetchProductDetail(captureId);
        await loadHistory();
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '加载商品详情失败';
    } finally {
        detailLoading.value = false;
    }
}

async function loadHistory() {
    if (!selectedDetail.value) return;
    history.value = await fetchPriceHistory(selectedDetail.value.id, selectedSkuId.value);
    renderChart();
}

function handleDrawerAfterOpenChange(open: boolean) {
    drawerReady.value = open;
    if (!open) {
        chart?.dispose();
        chart = null;
        return;
    }
    if (open && activeTab.value === 'trend') {
        renderChart();
    }
}

function handleTabChange(key: string) {
    activeTab.value = key;
    if (key === 'trend') {
        renderChart();
    }
}

async function renderChart() {
    await nextTick();
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (!drawerReady.value || activeTab.value !== 'trend' || !chartRef.value || !history.value.length) {
        chart?.dispose();
        chart = null;
        return;
    }

    chart = chart || echarts.init(chartRef.value);
    chart.setOption(selectedSkuId.value ? createSingleSkuChartOption() : createAllSkuChartOption(), true);
    chart.resize();
}

function createSingleSkuChartOption() {
    return {
        color: ['#1677ff'],
        tooltip: { trigger: 'axis' },
        grid: { top: 24, right: 20, bottom: 44, left: 56 },
        xAxis: {
            type: 'category',
            data: history.value.map(point => formatDate(point.capturedAt)),
            axisLabel: { color: '#667085' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#667085' }
        },
        series: [
            {
                name: '价格',
                type: 'line',
                smooth: true,
                symbolSize: 8,
                data: history.value.map(point => point.skuPrice)
            }
        ]
    };
}

function createAllSkuChartOption() {
    return {
        color: ['#1677ff'],
        tooltip: {
            trigger: 'item',
            formatter(params: { data: [string, number, string, string, string] }) {
                const [time, price, skuId, specName, stockText] = params.data;
                return `${specName || skuId}<br/>时间：${time}<br/>价格：${formatMoney(price)}<br/>库存：${stockText || '-'}`;
            }
        },
        grid: { top: 24, right: 20, bottom: 72, left: 56 },
        xAxis: {
            type: 'category',
            data: Array.from(new Set(history.value.map(point => formatDate(point.capturedAt)))),
            axisLabel: { color: '#667085', rotate: 20 }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#667085' }
        },
        series: [
            {
                name: 'SKU 价格分布',
                type: 'scatter',
                symbolSize: 10,
                data: history.value.map(point => [formatDate(point.capturedAt), point.skuPrice, point.skuId, point.specName, point.stockText])
            }
        ]
    };
}

function formatInteger(value?: number) {
    return Number(value || 0).toLocaleString('zh-CN');
}

function formatMoney(value?: number) {
    return `¥${Number(value || 0).toFixed(2)}`;
}

function formatPriceRange(minPrice: number, maxPrice: number, finalPrice: string) {
    if (minPrice || maxPrice) {
        return `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`;
    }
    return finalPrice || '-';
}

function formatDate(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
}
</script>
