# Publishing to npm

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup if you don't have one
2. **Login to npm**: Run `npm login` in your terminal
3. **Verify package name availability**: The name `openai-and-claude-usage-report-generator` is currently available

## Pre-Publishing Checklist

- [x] Package name is available
- [x] `prepublishOnly` script runs tests and builds
- [x] `bin` entry points to compiled JavaScript (`dist/cli.js`)
- [x] `files` field specifies what to include (`dist`, `README.md`)
- [x] `postbuild` script fixes CLI shebang for published package
- [ ] Add `repository`, `homepage`, and `bugs` fields (optional but recommended)
- [ ] Add `license` field (currently "ISC" but not in package.json)
- [ ] Consider adding `author` field

## Publishing Steps

### 1. Ensure you're logged in to npm

```bash
npm whoami
```

If not logged in:
```bash
npm login
```

### 2. Verify the build

```bash
yarn build
```

This will:
- Compile TypeScript to JavaScript
- Run the `postbuild` script to fix the CLI shebang
- Generate declaration files (`.d.ts`)

### 3. Test the package locally (optional but recommended)

```bash
# Pack the package without publishing
npm pack

# This creates a .tgz file you can test
# Install it in another project to test:
# npm install /path/to/openai-and-claude-usage-report-generator-1.0.0.tgz
```

### 4. Dry run (see what would be published)

```bash
npm publish --dry-run
```

This shows what files would be included without actually publishing.

### 5. Publish to npm

```bash
npm publish
```

For the first publish, this will publish version `1.0.0` as specified in `package.json`.

### 6. Verify publication

```bash
npm view openai-and-claude-usage-report-generator
```

Or visit: https://www.npmjs.com/package/openai-and-claude-usage-report-generator

## Updating the Package

For subsequent releases:

1. **Update version** in `package.json`:
   - Patch: `npm version patch` (1.0.0 → 1.0.1)
   - Minor: `npm version minor` (1.0.0 → 1.1.0)
   - Major: `npm version major` (1.0.0 → 2.0.0)

2. **Commit the version bump**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git push
   ```

3. **Publish**:
   ```bash
   npm publish
   ```

## Recommended package.json additions

Consider adding these fields before publishing:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/ericdahl-dev/openai-and-claude-usage-report-generator.git"
  },
  "homepage": "https://github.com/ericdahl-dev/openai-and-claude-usage-report-generator#readme",
  "bugs": {
    "url": "https://github.com/ericdahl-dev/openai-and-claude-usage-report-generator/issues"
  },
  "license": "ISC",
  "author": "Your Name <your.email@example.com>"
}
```

## Publishing Scopes (Optional)

If you want to publish under a scope (e.g., `@yourname/openai-and-claude-usage-report-generator`):

1. Update `package.json` name: `"name": "@yourname/openai-and-claude-usage-report-generator"`
2. Publish with: `npm publish --access public` (scoped packages are private by default)

## Troubleshooting

- **401 Unauthorized**: Run `npm login` again
- **403 Forbidden**: Package name might be taken, or you don't have permission
- **Package name conflict**: Choose a different name or use a scope
- **Missing files**: Check the `files` field in `package.json`
