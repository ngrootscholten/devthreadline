import { NextResponse } from 'next/server';
import { testConnection } from '../../lib/db';

export async function GET() {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const dbTest = await testConnection();
  
  return NextResponse.json({
    status: 'ok',
    config: {
      model,
      apiKeyConfigured: hasApiKey,
      database: {
        connected: dbTest.connected,
        urlConfigured: !!process.env.DATABASE_URL,
        ...(dbTest.error && { error: dbTest.error }),
        ...(dbTest.details && { details: dbTest.details })
      }
    }
  });
}

