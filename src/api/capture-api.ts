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

const API_BASE_URL = 'http://localhost:3001';

// 把采集到的商品数据发送给本机 Docker 后端，由后端写入 PostgreSQL。
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

    return result as { ok: true; id: number };
}
