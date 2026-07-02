import { db } from './db.js';
import { captureImages, captures, captureSkus } from './schema.js';

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

type ImageType = 'main' | 'detail';

// 保存一次完整采集快照。这里集中处理数据库写入，接口层不用关心表结构。
export async function saveCapture(payload: CapturePayload): Promise<number> {
    return db.transaction(async tx => {
        const [capture] = await tx
            .insert(captures)
            .values({
                pageUrl: payload.pageUrl || '',
                platform: payload.platform || 'taobao',
                itemId: payload.itemId || '',
                title: payload.title || '',
                shopName: payload.shopName || '',
                finalPrice: payload.finalPrice || '',
                rawData: payload.raw || {}
            })
            .returning({ id: captures.id });

        const captureId = capture.id;

        const skuRows = (payload.skus || []).map(sku => ({
            captureId,
            skuId: sku.skuId || '',
            specName: sku.specName || '',
            priceText: sku.priceText || '',
            stockText: sku.stockText || ''
        }));

        if (skuRows.length > 0) {
            await tx.insert(captureSkus).values(skuRows);
        }

        const imageRows = [...buildImageRows(captureId, 'main', payload.mainPicUrls || []), ...buildImageRows(captureId, 'detail', payload.detailPicUrls || [])];

        if (imageRows.length > 0) {
            await tx.insert(captureImages).values(imageRows);
        }

        return captureId;
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
