import { and, eq } from 'drizzle-orm';
import { db } from './db.js';
import { captureImages, captures, captureSkus, skuPriceSnapshots } from './schema.js';

export type CaptureSkuPayload = {
    skuId?: string;
    specName?: string;
    priceText?: string;
    stockText?: string;
};

export type CapturePayload = {
    pageUrl?: string;
    platform?: string;
    itemId?: string;
    title?: string;
    shopName?: string;
    finalPrice?: string;
    mainPicUrls?: string[];
    detailPicUrls?: string[];
    skus?: CaptureSkuPayload[];
    raw?: unknown;
};

export type SaveCaptureResult = {
    id: number;
    created: boolean;
    priceSnapshotCount: number;
};

type CaptureDb = {
    transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
};

type ImageType = 'main' | 'detail';

export async function saveCapture(payload: CapturePayload): Promise<SaveCaptureResult> {
    return saveCaptureWithDb(db, payload);
}

export async function saveCaptureWithDb(captureDb: CaptureDb, payload: CapturePayload): Promise<SaveCaptureResult> {
    return captureDb.transaction(async tx => {
        const platform = payload.platform || 'taobao';
        const itemId = payload.itemId || '';

        const existingCapture = await tx.query.captures.findFirst({
            columns: { id: true },
            where: and(eq(captures.platform, platform), eq(captures.itemId, itemId))
        });

        let captureId = existingCapture?.id;
        let created = false;

        if (!captureId) {
            const [capture] = await tx
                .insert(captures)
                .values({
                    pageUrl: payload.pageUrl || '',
                    platform,
                    itemId,
                    title: payload.title || '',
                    shopName: payload.shopName || '',
                    finalPrice: payload.finalPrice || '',
                    rawData: payload.raw || {}
                })
                .returning({ id: captures.id });

            captureId = capture.id;
            created = true;

            const skuRows = (payload.skus || []).map(sku => ({
                captureId,
                skuId: sku.skuId || '',
                specName: sku.specName || '',
                skuPrice: parsePrice(sku.priceText),
                stockText: sku.stockText || ''
            }));

            if (skuRows.length > 0) {
                await tx.insert(captureSkus).values(skuRows);
            }

            const imageRows = [...buildImageRows(captureId, 'main', payload.mainPicUrls || []), ...buildImageRows(captureId, 'detail', payload.detailPicUrls || [])];

            if (imageRows.length > 0) {
                await tx.insert(captureImages).values(imageRows);
            }
        }

        const priceSnapshotRows = (payload.skus || []).map(sku => ({
            captureId,
            platform,
            itemId,
            skuId: sku.skuId || '',
            specName: sku.specName || '',
            skuPrice: parsePrice(sku.priceText),
            priceText: sku.priceText || '',
            stockText: sku.stockText || ''
        }));

        if (priceSnapshotRows.length > 0) {
            await tx.insert(skuPriceSnapshots).values(priceSnapshotRows);
        }

        return {
            id: captureId,
            created,
            priceSnapshotCount: priceSnapshotRows.length
        };
    });
}

function buildImageRows(captureId: number, imageType: ImageType, imageUrls: string[]) {
    return imageUrls.map((imageUrl, index) => ({
        captureId,
        imageType,
        imageUrl: imageUrl || '',
        sortOrder: index + 1
    }));
}

function parsePrice(priceText?: string) {
    return parseFloat(priceText || '0') || 0;
}
