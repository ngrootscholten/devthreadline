# Publishing Threadline CLI to npm

This guide explains how to publish the Threadline CLI so users can run `npx @threadline/cli check` from anywhere.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **Login to npm**: Run `npm login` in your terminal
3. **Build the package**: Make sure everything compiles

## Publishing Options

### Option 1: Public Scoped Package (Recommended)

The package name is `@threadline/cli`, which is a scoped package. For scoped packages:

**Publishing:**
```bash
cd packages/cli
npm publish --access public
```

**Users will run:**
```bash
npx @threadline/cli check
```

### Option 2: Unscoped Package (Simpler command)

If you want users to run `npx threadline check` (without the scope), you need to:

1. Change the package name in `packages/cli/package.json`:
   ```json
   "name": "threadline"
   ```

2. Check if the name is available:
   ```bash
   npm view threadline
   ```
   (If it returns 404, the name is available)

3. Publish:
   ```bash
   cd packages/cli
   npm publish
   ```

**Users will run:**
```bash
npx threadline check
```

## Step-by-Step Publishing Process

### 1. Build the Package

```bash
cd packages/cli
npm run build
```

This creates the `dist/` folder with compiled JavaScript.

### 2. Test Locally Before Publishing

You can test the package locally using `npm pack`:

```bash
cd packages/cli
npm pack
```

This creates a `.tgz` file. You can install it locally:
```bash
npm install -g ./threadline-cli-0.1.0.tgz
```

Or test with npx from another directory:
```bash
# From another directory
npx ../devthreadline/packages/cli/threadline-cli-0.1.0.tgz check
```

### 3. Check What Will Be Published

```bash
cd packages/cli
npm pack --dry-run
```

This shows what files will be included (should be: `dist/`, `bin/`, `README.md`, `package.json`).

### 4. Publish to npm

**For scoped package (`@threadline/cli`):**
```bash
cd packages/cli
npm publish --access public
```

**For unscoped package (`threadline`):**
```bash
cd packages/cli
npm publish
```

### 5. Verify It Works

After publishing, test from a different directory:

```bash
# Create a test directory
mkdir test-threadline
cd test-threadline

# Test with npx
npx @threadline/cli check
# or
npx threadline check  # if you published unscoped
```

## Updating the Package

When you make changes:

1. **Update version** in `packages/cli/package.json`:
   ```json
   "version": "0.1.1"
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Publish**:
   ```bash
   npm publish --access public
   ```

## Testing Before Public Release

If you want to test without publishing publicly, you can:

### Option A: Use npm's Test Registry (Verdaccio)

```bash
npm install -g verdaccio
verdaccio
# In another terminal:
npm adduser --registry http://localhost:4873
npm publish --registry http://localhost:4873
```

### Option B: Use a Private Scoped Package

Publish to a private npm organization (requires paid npm account).

### Option C: Use GitHub Packages

Publish to GitHub Packages instead of npm.

## What Gets Published

The `.npmignore` file ensures only these files are published:
- `dist/` - Compiled JavaScript
- `bin/` - Executable script
- `README.md` - Documentation
- `package.json` - Package metadata

Source TypeScript files are NOT published.

## Troubleshooting

- **"Package name already exists"**: Choose a different name or use a scoped package
- **"You must verify your email"**: Check your npm account email
- **"Incorrect password"**: Run `npm login` again
- **"Missing files"**: Check that `dist/` exists after building

## After Publishing

Once published, users can:

1. **Use with npx** (no installation needed):
   ```bash
   npx @threadline/cli check
   ```

2. **Install globally**:
   ```bash
   npm install -g @threadline/cli
   threadline check
   ```

3. **Install locally in a project**:
   ```bash
   npm install --save-dev @threadline/cli
   npx threadline check
   ```

