import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { threadlineCheckRoute } from './api/routes/threadline-check';

// Load .env.local first, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // This will not override .env.local values

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Create a .env.local file in packages/server/ with:');
  console.error('   OPENAI_API_KEY=your_key_here');
  console.error('   OPENAI_MODEL=gpt-4o-mini  (optional, defaults to gpt-4o-mini)');
  console.error('   PORT=3000  (optional, defaults to 3000)');
  process.exit(1);
}

// Log configuration Banana
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
console.log('📋 Configuration:');
console.log(`   Model: ${model}`);
console.log(`   API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);

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

