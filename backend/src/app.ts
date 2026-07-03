import cors from 'cors';
import express from 'express';
import {
    getAnalyticsSummary,
    getPriceHistory,
    getProductDetail,
    listProducts,
    type AnalyticsSummary,
    type PriceHistoryPoint,
    type ProductDetail,
    type ProductListOptions,
    type ProductListResult
} from './analytics-repository.js';
import { saveCapture, type CapturePayload, type SaveCaptureResult } from './capture-repository.js';

export type AppServices = {
    saveCapture(payload: CapturePayload): Promise<SaveCaptureResult>;
    getAnalyticsSummary(): Promise<AnalyticsSummary>;
    listProducts(options: ProductListOptions): Promise<ProductListResult>;
    getProductDetail(captureId: number): Promise<ProductDetail | null>;
    getPriceHistory(captureId: number, skuId?: string): Promise<PriceHistoryPoint[]>;
};

const defaultServices: AppServices = {
    saveCapture,
    getAnalyticsSummary,
    listProducts,
    getProductDetail,
    getPriceHistory
};

export function createApp(services: AppServices = defaultServices) {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.post('/api/captures', async (req, res) => {
        try {
            const result = await services.saveCapture((req.body || {}) as CapturePayload);
            res.json({ ok: true, ...result });
        } catch (error) {
            console.error('Failed to save capture data:', error);
            res.status(500).json({ ok: false, message: '保存失败' });
        }
    });

    app.get('/api/analytics/summary', async (_req, res) => {
        try {
            res.json(await services.getAnalyticsSummary());
        } catch (error) {
            console.error('Failed to load analytics summary:', error);
            res.status(500).json({ ok: false, message: '加载统计数据失败' });
        }
    });

    app.get('/api/products', async (req, res) => {
        try {
            const result = await services.listProducts({
                search: String(req.query.search || ''),
                page: Number(req.query.page || 1),
                pageSize: Number(req.query.pageSize || 20)
            });
            res.json(result);
        } catch (error) {
            console.error('Failed to list products:', error);
            res.status(500).json({ ok: false, message: '加载商品列表失败' });
        }
    });

    app.get('/api/products/:captureId', async (req, res) => {
        try {
            const captureId = Number(req.params.captureId);
            const product = Number.isFinite(captureId) ? await services.getProductDetail(captureId) : null;
            if (!product) {
                res.status(404).json({ ok: false, message: '商品不存在' });
                return;
            }
            res.json(product);
        } catch (error) {
            console.error('Failed to load product detail:', error);
            res.status(500).json({ ok: false, message: '加载商品详情失败' });
        }
    });

    app.get('/api/products/:captureId/price-history', async (req, res) => {
        try {
            const captureId = Number(req.params.captureId);
            if (!Number.isFinite(captureId)) {
                res.status(404).json({ ok: false, message: '商品不存在' });
                return;
            }
            res.json(await services.getPriceHistory(captureId, String(req.query.skuId || '')));
        } catch (error) {
            console.error('Failed to load price history:', error);
            res.status(500).json({ ok: false, message: '加载价格历史失败' });
        }
    });

    return app;
}
