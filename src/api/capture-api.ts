export type CaptureSku = {
    skuId: string;
    specName: string;
    priceText: string;
    stockText: string;
};

export type CapturePayload = {
    pageUrl: string;
    platform: string;
    itemId: string;
    title: string;
    shopName: string;
    finalPrice: string;
    mainPicUrls: string[];
    detailPicUrls: string[];
    skus: CaptureSku[];
    raw: unknown;
};

export type SaveCaptureResult = {
    ok: true;
    id: number;
    created: boolean;
    priceSnapshotCount: number;
};

const API_BASE_URL = 'http://localhost:3001';

export async function saveCapture(payload: CapturePayload) {
    const response = await fetch(`${API_BASE_URL}/api/captures`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('后端保存失败，请确认 Docker 服务已经启动');
    }

    const result = await response.json();
    if (!result.ok) {
        throw new Error(result.message || '后端保存失败');
    }

    return result as SaveCaptureResult;
}
