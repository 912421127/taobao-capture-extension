import cors from 'cors';
import express from 'express';
import { saveCapture, type CapturePayload } from './capture-repository.js';

const app = express();
const port = Number(process.env.PORT || 3001);

// 允许浏览器插件从 localhost 调用这个后端。
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/captures', async (req, res) => {
    try {
        const id = await saveCapture((req.body || {}) as CapturePayload);
        res.json({ ok: true, id });
    } catch (error) {
        console.error('保存采集数据失败：', error);
        res.status(500).json({ ok: false, message: '保存失败' });
    }
});

app.listen(port, () => {
    console.log(`采集后端已启动：http://localhost:${port}`);
});
