import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { threadlineCheckRoute } from './api/routes/threadline-check';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/threadline-check', threadlineCheckRoute);

app.listen(PORT, () => {
  console.log(`🚀 Threadline server running on port ${PORT}`);
});

