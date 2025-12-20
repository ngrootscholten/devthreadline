# Testing Threadline Production Endpoint

## 1. Find Your Vercel Production URL

Your Threadline server is deployed on Vercel. The production URL will be:
- `https://your-project-name.vercel.app` (or your custom domain)

You can find this in:
- Vercel Dashboard → Your Project → Settings → Domains
- Or check your Vercel deployment logs

## 2. Test Health Endpoint

The health endpoint doesn't require authentication and confirms the server is running:

```bash
curl https://your-project-name.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "config": {
    "model": "gpt-4o-mini",
    "apiKeyConfigured": true
  }
}
```

## 3. Test Threadline Check Endpoint

The main endpoint requires authentication. Test with a minimal request:

```bash
curl -X POST https://your-project-name.vercel.app/api/threadline-check \
  -H "Content-Type: application/json" \
  -d '{
    "threadlines": [{
      "id": "test",
      "version": "1.0.0",
      "patterns": ["**/*.ts"],
      "content": "Test threadline"
    }],
    "diff": "+const x = 1;",
    "files": ["test.ts"],
    "apiKey": "your-api-key",
    "account": "test@example.com"
  }'
```

**Note:** Replace `your-api-key` with your actual `THREADLINE_API_KEY` from Vercel environment variables.

## 4. Verify Environment Variables in Vercel

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

- `THREADLINE_API_KEY` - Your API key (for client authentication)
- `OPENAI_API_KEY` - Your OpenAI API key (for LLM calls)
- `OPENAI_MODEL` - Optional (defaults to `gpt-4o-mini`)

## 5. Test from CLI

Once you know your production URL, test from the CLI:

```bash
# Set the API URL
export THREADLINE_API_URL=https://your-project-name.vercel.app
export THREADLINE_API_KEY=your-api-key
export THREADLINE_ACCOUNT=your-email@example.com

# Run a check
npx threadlines check --api-url https://your-project-name.vercel.app
```

