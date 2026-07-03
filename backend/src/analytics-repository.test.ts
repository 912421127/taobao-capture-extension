import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getAnalyticsSummaryWithDb,
    getPriceHistoryWithDb,
    getProductDetailWithDb,
    listProductsWithDb,
    type AnalyticsDb
} from './analytics-repository.js';

type QueryResult = {
    rows: Record<string, unknown>[];
};

function createMockDb(results: QueryResult[]): AnalyticsDb & { calls: string[] } {
    const calls: string[] = [];

    return {
        calls,
        execute(query: { sql?: string } | string) {
            calls.push(typeof query === 'string' ? query : query.sql || '');
            const result = results.shift();
            if (!result) {
                throw new Error('Unexpected query');
            }
            return Promise.resolve(result);
        }
    };
}

test('getAnalyticsSummary returns normalized aggregate totals', async () => {
    const db = createMockDb([
        {
            rows: [
                {
                    product_count: '3',
                    sku_count: '9',
                    image_count: '12',
                    snapshot_count: '21',
                    min_price: '12.5',
                    max_price: '199.9',
                    latest_snapshot_at: new Date('2026-07-02T09:30:00.000Z')
                }
            ]
        }
    ]);

    const summary = await getAnalyticsSummaryWithDb(db);

    assert.deepEqual(summary, {
        productCount: 3,
        skuCount: 9,
        imageCount: 12,
        snapshotCount: 21,
        minPrice: 12.5,
        maxPrice: 199.9,
        latestSnapshotAt: '2026-07-02T09:30:00.000Z'
    });
});

test('listProducts clamps pagination and maps product rows', async () => {
    const db = createMockDb([
        {
            rows: [
                {
                    total_count: '1',
                    id: 101,
                    platform: 'taobao',
                    item_id: '123',
                    title: 'Test Product',
                    shop_name: 'Test Shop',
                    final_price: '88',
                    created_at: new Date('2026-07-01T00:00:00.000Z'),
                    sku_count: '2',
                    min_price: '80',
                    max_price: '99',
                    latest_snapshot_at: new Date('2026-07-02T00:00:00.000Z')
                }
            ]
        }
    ]);

    const result = await listProductsWithDb(db, { search: '123', page: 0, pageSize: 200 });

    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 100);
    assert.equal(result.total, 1);
    assert.deepEqual(result.items, [
        {
            id: 101,
            platform: 'taobao',
            itemId: '123',
            title: 'Test Product',
            shopName: 'Test Shop',
            finalPrice: '88',
            createdAt: '2026-07-01T00:00:00.000Z',
            skuCount: 2,
            minPrice: 80,
            maxPrice: 99,
            latestSnapshotAt: '2026-07-02T00:00:00.000Z'
        }
    ]);
});

test('getProductDetail returns null when product does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);

    const detail = await getProductDetailWithDb(db, 999);

    assert.equal(detail, null);
});

test('getProductDetail maps product, images, and skus', async () => {
    const db = createMockDb([
        {
            rows: [
                {
                    id: 101,
                    platform: 'tmall',
                    item_id: '456',
                    title: 'Detail Product',
                    shop_name: 'Detail Shop',
                    final_price: '59',
                    page_url: 'https://detail.tmall.com/item.htm?id=456',
                    created_at: new Date('2026-07-01T00:00:00.000Z')
                }
            ]
        },
        {
            rows: [
                { id: 1, image_type: 'main', image_url: 'https://img/main.jpg', sort_order: 1 },
                { id: 2, image_type: 'detail', image_url: 'https://img/detail.jpg', sort_order: 2 }
            ]
        },
        {
            rows: [
                { id: 10, sku_id: 'sku-1', spec_name: 'Red', price: '59.5', stock_text: 'In stock' }
            ]
        }
    ]);

    const detail = await getProductDetailWithDb(db, 101);

    assert.deepEqual(detail, {
        id: 101,
        platform: 'tmall',
        itemId: '456',
        title: 'Detail Product',
        shopName: 'Detail Shop',
        finalPrice: '59',
        pageUrl: 'https://detail.tmall.com/item.htm?id=456',
        createdAt: '2026-07-01T00:00:00.000Z',
        images: [
            { id: 1, imageType: 'main', imageUrl: 'https://img/main.jpg', sortOrder: 1 },
            { id: 2, imageType: 'detail', imageUrl: 'https://img/detail.jpg', sortOrder: 2 }
        ],
        skus: [{ id: 10, skuId: 'sku-1', specName: 'Red', skuPrice: 59.5, stockText: 'In stock' }]
    });
});

test('getPriceHistory maps snapshots in repository order', async () => {
    const db = createMockDb([
        {
            rows: [
                {
                    id: 1,
                    capture_id: 101,
                    item_id: '123',
                    sku_id: 'sku-1',
                    spec_name: 'Red',
                    price: '88.5',
                    price_text: '88.50',
                    stock_text: 'In stock',
                    captured_at: new Date('2026-07-01T01:00:00.000Z')
                }
            ]
        }
    ]);

    const history = await getPriceHistoryWithDb(db, 101, 'sku-1');

    assert.deepEqual(history, [
        {
            id: 1,
            captureId: 101,
            itemId: '123',
            skuId: 'sku-1',
            specName: 'Red',
            skuPrice: 88.5,
            priceText: '88.50',
            stockText: 'In stock',
            capturedAt: '2026-07-01T01:00:00.000Z'
        }
    ]);
});
