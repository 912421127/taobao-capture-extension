import assert from 'node:assert/strict';
import test from 'node:test';
import { saveCaptureWithDb, type CapturePayload } from './capture-repository.js';

function createInsertBuilder(state: MockDbState, tableName: string) {
    return {
        values(value: unknown) {
            if (tableName === 'captures') {
                state.captureInserts.push(value);
                return {
                    returning() {
                        return Promise.resolve([{ id: state.existingCaptureId || 101 }]);
                    }
                };
            }

            if (tableName === 'capture_skus') {
                state.skuInserts.push(value);
            }

            if (tableName === 'capture_images') {
                state.imageInserts.push(value);
            }

            if (tableName === 'sku_price_snapshots') {
                state.priceSnapshotInserts.push(value);
            }

            return Promise.resolve();
        }
    };
}

type MockDbState = {
    existingCaptureId?: number;
    captureInserts: unknown[];
    skuInserts: unknown[];
    imageInserts: unknown[];
    priceSnapshotInserts: unknown[];
};

function createMockDb(existingCaptureId?: number) {
    const state: MockDbState = {
        existingCaptureId,
        captureInserts: [],
        skuInserts: [],
        imageInserts: [],
        priceSnapshotInserts: []
    };

    const tx = {
        query: {
            captures: {
                findFirst: () => Promise.resolve(existingCaptureId ? { id: existingCaptureId } : undefined)
            }
        },
        insert: (table: Record<PropertyKey, unknown>) => createInsertBuilder(state, getTableName(table))
    };

    return {
        state,
        db: {
            transaction: <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx)
        }
    };
}

function getTableName(table: Record<PropertyKey, unknown>) {
    const nameSymbol = Object.getOwnPropertySymbols(table).find(symbol => String(symbol) === 'Symbol(drizzle:Name)');
    return String(nameSymbol ? table[nameSymbol] : '');
}

const payload: CapturePayload = {
    pageUrl: 'https://item.taobao.com/item.htm?id=123',
    platform: 'taobao',
    itemId: '123',
    title: '测试商品',
    shopName: '测试店铺',
    finalPrice: '88',
    mainPicUrls: ['https://img.example/main.jpg'],
    detailPicUrls: ['https://img.example/detail.jpg'],
    skus: [
        { skuId: 'sku-1', specName: '红色', priceText: '88.50', stockText: '有货' },
        { skuId: 'sku-2', specName: '蓝色', priceText: '99.00', stockText: '缺货' }
    ],
    raw: {}
};

test('first capture creates product rows and sku price snapshots', async () => {
    const { db, state } = createMockDb();

    const result = await saveCaptureWithDb(db, payload);

    assert.deepEqual(result, { id: 101, created: true, priceSnapshotCount: 2 });
    assert.equal(state.captureInserts.length, 1);
    assert.equal(state.skuInserts.length, 1);
    assert.equal(state.imageInserts.length, 1);
    assert.equal(state.priceSnapshotInserts.length, 1);
});

test('duplicate capture skips product rows but records sku price snapshots', async () => {
    const { db, state } = createMockDb(101);

    const result = await saveCaptureWithDb(db, payload);

    assert.deepEqual(result, { id: 101, created: false, priceSnapshotCount: 2 });
    assert.equal(state.captureInserts.length, 0);
    assert.equal(state.skuInserts.length, 0);
    assert.equal(state.imageInserts.length, 0);
    assert.equal(state.priceSnapshotInserts.length, 1);
});
