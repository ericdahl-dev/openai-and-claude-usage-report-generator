# Publishing to npm

## Automated Publishing (Recommended)

This repository uses **GitHub Actions** to automatically publish to npm when you push a version tag.

### Setup (One-time)

**Using npm Trusted Publishers (Recommended - Already Configured)**:

This repository uses npm's Trusted Publishers feature with GitHub Actions OIDC, which means:
- ✅ No npm tokens to manage or store
- ✅ More secure - tokens are automatically generated per workflow run
- ✅ Already configured - just push version tags to publish

If you need to set up Trusted Publishers for a new repository:
1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/oauth-applications
2. Click "Add GitHub Publisher"
3. Select your GitHub organization/user and repository
4. Configure the workflow name (e.g., `Publish to npm`) and workflow file path (e.g., `.github/workflows/publish.yml`)

**Alternative: Using npm token** (if Trusted Publishers aren't available):
1. Create an npm access token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Add it as `NPM_TOKEN` in GitHub Secrets
3. Update the workflow to use `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`

### How It Works

When you push a version tag (e.g., `v1.2.3`), GitHub Actions will:
1. ✅ Run tests (`yarn test:run`)
2. ✅ Build the package (`yarn build`)
3. ✅ Verify the package version matches the tag
4. ✅ Publish to npm with provenance
5. ✅ Verify the publication

### Releasing a New Version

**Option 1: Use the release scripts** (recommended - publishes automatically via GitHub Actions):

```bash
# Patch release (1.2.4 → 1.2.5) - bug fixes
yarn release:patch

# Minor release (1.2.4 → 1.3.0) - new features, backward compatible
yarn release:minor

# Major release (1.2.4 → 2.0.0) - breaking changes
yarn release:major
```

These scripts will:
1. Bump the version in `package.json`
2. Create a git commit with the version change
3. Create a git tag (e.g., `v1.2.5`)
4. Push the commit and tag to GitHub
5. **GitHub Actions automatically publishes to npm** 🚀

**Option 2: Manual version bump** (for more control):

```bash
# Bump version
npm version patch   # or minor, major

# Push with tags
git push --follow-tags

# GitHub Actions will automatically publish
```

**Note**: The `release:*` scripts in `package.json` currently include `npm publish` locally. If you're using automated publishing, you can remove the `npm publish` part from those scripts and just push tags. However, keeping it allows for manual fallback if needed.

## Manual Publishing (Fallback)

If you need to publish manually (e.g., if GitHub Actions fails):

### Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup if you don't have one
2. **Login to npm**: Run `npm login` in your terminal
3. **Verify package name availability**: The scoped package `@ericdahl.dev/openai-and-claude-usage-report-generator` is available under your organization

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
# npm install /path/to/ericdahl.dev-openai-and-claude-usage-report-generator-1.0.0.tgz
```

### 4. Dry run (see what would be published)

```bash
npm publish --dry-run
```

This shows what files would be included without actually publishing.

### 5. Publish to npm

```bash
npm publish --access public
```

**Important**: Scoped packages are private by default. Use `--access public` to make it publicly available.

For the first publish, this will publish version `1.0.0` as specified in `package.json`.

### 6. Verify publication

```bash
npm view @ericdahl.dev/openai-and-claude-usage-report-generator
```

Or visit: https://www.npmjs.com/package/@ericdahl.dev/openai-and-claude-usage-report-generator

## Updating the Package (Manual)

For manual releases, use the convenient npm scripts:

### Quick Release

**One command to bump version, commit, tag, push, and publish:**

```bash
# Patch release (1.0.0 → 1.0.1) - bug fixes
yarn release:patch

# Minor release (1.0.0 → 1.1.0) - new features, backward compatible
yarn release:minor

# Major release (1.0.0 → 2.0.0) - breaking changes
yarn release:major
```

This automatically:
1. Bumps the version in `package.json`
2. Creates a git commit with the version change
3. Creates a git tag (e.g., `v1.0.1`)
4. Pushes the commit and tag to GitHub
5. Runs tests and builds (via `prepublishOnly`)
6. Publishes to npm locally

**Note**: If using automated GitHub Actions publishing, you can modify these scripts to remove the `npm publish` step and rely on the workflow instead.

### Manual Version Bump (Alternative)

If you want more control:

1. **Bump version and create git tag**:
   ```bash
   # Patch: 1.0.0 → 1.0.1
   npm version patch

   # Minor: 1.0.0 → 1.1.0
   npm version minor

   # Major: 1.0.0 → 2.0.0
   npm version major
   ```

   This automatically:
   - Updates `package.json` version
   - Creates a git commit
   - Creates a git tag

2. **Push the version commit and tag**:
   ```bash
   git push --follow-tags
   ```

3. **Publish**:
   ```bash
   npm publish --access public
   ```

### Version Bump Only (No Publish)

If you just want to bump the version without publishing:

```bash
# Bump version and push to git
yarn version:patch   # or version:minor, version:major
```

This bumps the version, commits, tags, and pushes, but doesn't publish to npm.

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

## Publishing Scopes

This package is published under the `@ericdahl.dev` scope. Scoped packages require:

1. Package name in `package.json`: `"name": "@ericdahl.dev/openai-and-claude-usage-report-generator"`
2. Publish with: `npm publish --access public` (scoped packages are private by default)

The release scripts (`release:patch`, `release:minor`, `release:major`) automatically include `--access public`.

## Troubleshooting

- **401 Unauthorized**: Run `npm login` again
- **403 Forbidden**: Package name might be taken, or you don't have permission
- **Package name conflict**: Choose a different name or use a scope
- **Missing files**: Check the `files` field in `package.json`
