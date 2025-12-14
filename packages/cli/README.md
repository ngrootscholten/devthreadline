# threadlines

Threadline CLI - AI-powered linter based on your natural language documentation.

## Installation

```bash
npm install -g threadlines
```

Or use with npx:

```bash
npx threadlines check
```

## Usage

```bash
threadlines check
```

## Configuration
BANANA
- `THREADLINE_API_URL` - Server URL (default: http://localhost:3000)
  - Can also be set with `--api-url` flag: `npx threadlines check --api-url http://your-server.com`

## Threadline Files

Create a `/threadlines` folder in your repository. Each markdown file is a threadline defining a code quality standard.

### Format

Each threadline file must have YAML frontmatter and a markdown body:

```markdown
---
id: unique-id
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/*.ts"
context_files:
  - "path/to/context-file.ts"
---

# Your Threadline Title

Your guidelines and standards here...
```

### Required Fields

- **`id`**: Unique identifier (e.g., `sql-queries`, `error-handling`)
- **`version`**: Semantic version (e.g., `1.0.0`)
- **`patterns`**: Array of glob patterns matching files to check (e.g., `["**/api/**", "**/*.ts"]`)
- **Body**: Markdown content describing your standards

### Optional Fields

- **`context_files`**: Array of file paths that provide context (always included, even if unchanged)

### Example: SQL Queries with Schema Context

```markdown
---
id: sql-queries
version: 1.0.0
patterns:
  - "**/queries/**"
  - "**/*.sql"
context_files:
  - "schema.sql"
---

# SQL Query Standards

All SQL queries must:
- Reference tables and columns that exist in schema.sql
- Use parameterized queries (no string concatenation)
- Include proper indexes for WHERE clauses
```

The `schema.sql` file will always be included as context, even if you're only changing query files.

