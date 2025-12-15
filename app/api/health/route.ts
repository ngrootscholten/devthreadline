import { NextResponse } from 'next/server';

export async function GET() {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    config: {
      model,
      apiKeyConfigured: hasApiKey
    }
  });
}

