import cors from 'cors';
import express from 'express';
import { saveCapture, type CapturePayload } from './capture-repository.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/captures', async (req, res) => {
    try {
        const result = await saveCapture((req.body || {}) as CapturePayload);
        res.json({ ok: true, ...result });
    } catch (error) {
        console.error('Failed to save capture data:', error);
        res.status(500).json({ ok: false, message: '保存失败' });
    }
});

app.listen(port, () => {
    console.log(`Capture backend started: http://localhost:${port}`);
});
