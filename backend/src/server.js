import cors from 'cors';
import express from 'express';
import { pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);

// 允许浏览器插件从 localhost 调用这个后端。
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/captures', async (req, res) => {
    const payload = req.body || {};
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 主表保存一次采集快照，raw_data 保留完整原始数据，方便后续扩展字段。
        const captureResult = await client.query(
            `insert into captures (
        page_url,
        platform,
        item_id,
        title,
        shop_name,
        final_price,
        raw_data
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id`,
            [payload.pageUrl || '', payload.platform || 'taobao', payload.itemId || '', payload.title || '', payload.shopName || '', payload.finalPrice || '', payload.raw || {}]
        );

        const captureId = captureResult.rows[0].id;

        // SKU 明细单独存表，后面按规格、库存、价格查询会更方便。
        for (const sku of payload.skus || []) {
            await client.query(
                `insert into capture_skus (
          capture_id,
          sku_id,
          spec_name,
          price_text,
          stock_text
        ) values ($1, $2, $3, $4, $5)`,
                [captureId, sku.skuId || '', sku.specName || '', sku.priceText || '', sku.stockText || '']
            );
        }

        await insertImages(client, captureId, 'main', payload.mainPicUrls || []);
        await insertImages(client, captureId, 'detail', payload.detailPicUrls || []);

        await client.query('COMMIT');
        res.json({ ok: true, id: captureId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('保存采集数据失败：', error);
        res.status(500).json({ ok: false, message: '保存失败' });
    } finally {
        client.release();
    }
});

async function insertImages(client, captureId, imageType, imageUrls) {
    for (const [index, imageUrl] of imageUrls.entries()) {
        await client.query(
            `insert into capture_images (
        capture_id,
        image_type,
        image_url,
        sort_order
      ) values ($1, $2, $3, $4)`,
            [captureId, imageType, imageUrl || '', index + 1]
        );
    }
}

app.listen(port, () => {
    console.log(`采集后端已启动：http://localhost:${port}`);
});
