# @threadline/cli

Threadline CLI - AI-powered linter based on your natural language documentation.

## Installation

```bash
npm install -g @threadline/cli
```

Or use with npx:

```bash
npx @threadline/cli check
```

## Usage

```bash
threadline check
```

## Configuration

- `THREADLINE_API_URL` - Server URL (default: http://localhost:3000)
- `OPENAI_API_KEY` - Your OpenAI API key (required)

## Expert Files

Create an `/experts` folder in your repository with markdown files. See [Expert Format](../../docs/EXPERT_FORMAT.md) for details.

