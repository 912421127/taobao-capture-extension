<template>
    <main class="page">
        <a-button type="primary" @click="extractCurrentPage">提取当前页</a-button>
        <div style="margin: 10px 5px">
            {{ 商品信息.店铺 }}
        </div>
        <div style="margin: 10px 5px">{{ 商品类型 }} {{ 商品ID }}</div>
        <div style="margin: 10px 5px">
            <a-typography-paragraph v-if="title !== ''" :copyable="{ text: title }">
                <a-tag v-if="isOffShelf" color="#f5222d">下架</a-tag>
                {{ title }}
            </a-typography-paragraph>
            <a-typography-paragraph v-if="finalPrice !== ''" style="color: #fa2c19" :copyable="{ text: finalPrice }">到手价 ￥{{ finalPrice }}</a-typography-paragraph>
            <a-typography-paragraph v-if="pPrice !== ''" style="color: #fa2c19" :copyable="{ text: finalPrice }">原价 ￥{{ pPrice }}</a-typography-paragraph>
        </div>
        <div style="margin: 10px 5px">
            <a-table :dataSource="sku信息" :columns="columns" row-key="规格编号" />
        </div>
        <template v-if="mainPicUrls.length > 0">
            <a-typography-title :level="3">主图</a-typography-title>
            <a-flex :gap="5" style="flex-wrap: wrap">
                <a-image-preview-group>
                    <a-image v-for="(imgUrl, index) in mainPicUrls" :key="index" :src="imgUrl" :width="80" style="border-radius: 5px; overflow: hidden" />
                </a-image-preview-group>
                <div style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center">
                    <a-button @click="downloadImg(mainPicUrls, '主图')" type="primary" style="height: auto">
                        下载
                        <br />
                        主图
                    </a-button>
                </div>
            </a-flex>
        </template>
        <template v-if="picUrls.length > 0">
            <a-typography-title :level="3">详情图</a-typography-title>
            <a-flex :gap="5" style="flex-wrap: wrap">
                <div style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center">
                    <a-button @click="downloadImg(picUrls, '详情')" type="primary" style="height: auto">
                        下载
                        <br />
                        详情
                    </a-button>
                </div>
                <a-image-preview-group>
                    <a-image v-for="(imgUrl, index) in picUrls" :key="index" :src="imgUrl" :width="80" style="border-radius: 5px; overflow: hidden" />
                </a-image-preview-group>
            </a-flex>
        </template>
        <a-back-top />
    </main>
</template>
<script lang="ts">
import { 当前标签页, 当前标签页链接 } from '@/lib/辅助工具/当前标签页';
import { ref, reactive } from 'vue';
import { searchTaobao, 从淘宝商品前端数据查询 } from '../../src/taobao-original';
export default {
    setup() {
        return {
            商品类型: ref(''),
            商品ID: ref(''),
            mainPicUrls: ref<string[]>([]),
            title: ref(''),
            finalPrice: ref(''),
            pPrice: ref(''),
            //详情图
            picUrls: ref<string[]>([]),
            isOffShelf: ref(false),
            当前标签页,
            当前标签页链接,
            sku信息: ref<
                {
                    规格编号: string;
                    规格名称: string;
                    到手价: string;
                    库存: string;
                }[]
            >([]),
            商品信息: reactive({
                店铺: ''
            }),
            columns: [
                { title: '规格编号', dataIndex: '规格编号' },
                { title: '规格名称', dataIndex: '规格名称' },
                { title: '到手价', dataIndex: '到手价' },
                { title: '库存', dataIndex: '库存' }
            ]
        };
    },
    watch: {
        当前标签页链接: {
            handler() {
                this.extractCurrentPage();
            }
        }
    },
    methods: {
        async extractCurrentPage() {
            const tab = this.当前标签页;
            if (!tab || !tab.id) {
                return [];
            }
            const 商品前端数据 = await searchTaobao(tab);
            const 规格数据 = 从淘宝商品前端数据查询(商品前端数据.loaderData.home.data.res);
            this.sku信息 = 规格数据;
            const [{ result: 详情页商品数据 }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return {
                        // class mainTitle--开头的元素
                        标题: document.querySelector('[class^="mainTitle--"]')?.textContent || '',
                        主图: [...document.querySelectorAll('[class^="thumbnail--"] img')].map((item: any) => item.src || ''),
                        价格: document.querySelector('[class^="highlightPrice--"] > [class^="text--"]')?.textContent || '',
                        店铺: document.querySelector('[class^="shopName--"]')?.textContent || '',
                        详情: [...document.querySelectorAll('#imageTextInfo-container img')].map(i => {
                            const url = i.getAttribute('data-src') || i.getAttribute('src');
                            return url?.startsWith('http') ? url : `https:${url}`;
                        })
                    };
                }
            });
            this.title = 详情页商品数据?.标题 || '';
            this.finalPrice = 详情页商品数据?.价格 || '';
            this.mainPicUrls = 详情页商品数据?.主图 || [];
            this.picUrls = 详情页商品数据?.详情 || [];
            this.商品信息.店铺 = 详情页商品数据?.店铺 || '';
        },
        async downloadImg(urls: string[], prefix: string = '') {
            urls.forEach((imgUrl, index) => {
                const sku = this.商品ID;
                // 后缀名
                const suffix = imgUrl.split('.').pop();
                const fileName = (index + 1).toString().padStart(2, '0');
                chrome.downloads.download({
                    url: imgUrl,
                    filename: [this.商品类型, sku, `${prefix}_${fileName}.${suffix}`].join('/')
                });
            });
        }
    }
};
</script>
