import assert from 'node:assert/strict';
import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApp, type AppServices } from './app.js';

async function withServer(services: AppServices, callback: (baseUrl: string) => Promise<void>) {
    const server = createApp(services).listen(0);
    await once(server, 'listening');
    const address = server.address() as AddressInfo;

    try {
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        server.close();
        await once(server, 'close');
    }
}

test('GET /api/analytics/summary returns summary payload', async () => {
    await withServer(
        {
            saveCapture: async () => ({ id: 1, created: true, priceSnapshotCount: 0 }),
            getAnalyticsSummary: async () => ({
                productCount: 1,
                skuCount: 2,
                imageCount: 3,
                snapshotCount: 4,
                minPrice: 10,
                maxPrice: 20,
                latestSnapshotAt: '2026-07-02T00:00:00.000Z'
            }),
            listProducts: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
            getProductDetail: async () => null,
            getPriceHistory: async () => []
        },
        async baseUrl => {
            const response = await fetch(`${baseUrl}/api/analytics/summary`);

            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), {
                productCount: 1,
                skuCount: 2,
                imageCount: 3,
                snapshotCount: 4,
                minPrice: 10,
                maxPrice: 20,
                latestSnapshotAt: '2026-07-02T00:00:00.000Z'
            });
        }
    );
});

test('GET /api/products forwards normalized query options', async () => {
    let receivedOptions: unknown;

    await withServer(
        {
            saveCapture: async () => ({ id: 1, created: true, priceSnapshotCount: 0 }),
            getAnalyticsSummary: async () => ({
                productCount: 0,
                skuCount: 0,
                imageCount: 0,
                snapshotCount: 0,
                minPrice: 0,
                maxPrice: 0,
                latestSnapshotAt: ''
            }),
            listProducts: async options => {
                receivedOptions = options;
                return { items: [], total: 0, page: 2, pageSize: 30 };
            },
            getProductDetail: async () => null,
            getPriceHistory: async () => []
        },
        async baseUrl => {
            const response = await fetch(`${baseUrl}/api/products?search=bag&page=2&pageSize=30`);

            assert.equal(response.status, 200);
            assert.deepEqual(receivedOptions, { search: 'bag', page: 2, pageSize: 30 });
            assert.deepEqual(await response.json(), { items: [], total: 0, page: 2, pageSize: 30 });
        }
    );
});

test('GET /api/products/:captureId returns 404 when product is missing', async () => {
    await withServer(
        {
            saveCapture: async () => ({ id: 1, created: true, priceSnapshotCount: 0 }),
            getAnalyticsSummary: async () => ({
                productCount: 0,
                skuCount: 0,
                imageCount: 0,
                snapshotCount: 0,
                minPrice: 0,
                maxPrice: 0,
                latestSnapshotAt: ''
            }),
            listProducts: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
            getProductDetail: async () => null,
            getPriceHistory: async () => []
        },
        async baseUrl => {
            const response = await fetch(`${baseUrl}/api/products/999`);

            assert.equal(response.status, 404);
            assert.deepEqual(await response.json(), { ok: false, message: '商品不存在' });
        }
    );
});

test('GET /api/products/:captureId/price-history forwards sku filter', async () => {
    let receivedCaptureId = 0;
    let receivedSkuId = '';

    await withServer(
        {
            saveCapture: async () => ({ id: 1, created: true, priceSnapshotCount: 0 }),
            getAnalyticsSummary: async () => ({
                productCount: 0,
                skuCount: 0,
                imageCount: 0,
                snapshotCount: 0,
                minPrice: 0,
                maxPrice: 0,
                latestSnapshotAt: ''
            }),
            listProducts: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
            getProductDetail: async () => null,
            getPriceHistory: async (captureId, skuId) => {
                receivedCaptureId = captureId;
                receivedSkuId = skuId || '';
                return [];
            }
        },
        async baseUrl => {
            const response = await fetch(`${baseUrl}/api/products/101/price-history?skuId=sku-1`);

            assert.equal(response.status, 200);
            assert.equal(receivedCaptureId, 101);
            assert.equal(receivedSkuId, 'sku-1');
            assert.deepEqual(await response.json(), []);
        }
    );
});
