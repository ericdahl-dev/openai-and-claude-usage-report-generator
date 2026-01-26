# OpenAI and Claude Usage Report Generator

A CLI tool and library for generating billing reports from the **OpenAI** or **Claude (Anthropic)** cost APIs. Outputs Markdown (readable) and CSV (data) reports.

Can be used as:
- **CLI tool**: Run reports from the command line
- **Library**: Import functions programmatically in your Node.js/TypeScript projects

## Features

- Fetches usage/cost data from OpenAI's organization costs API or Anthropic's [Usage and Cost API](https://platform.claude.com/docs/en/build-with-claude/usage-cost-api)
- Generates detailed Markdown reports with summaries and breakdowns
- Exports CSV data for further analysis
- Daily and line-item cost breakdowns

## Prerequisites

- Node.js 18+ and Yarn (`.nvmrc` specifies 22)
- **OpenAI**: **Admin API key** (not a standard API key), Organization ID, and Project ID
  - ⚠️ **Important**: Standard API keys do not work. You need an admin key with organization access.
  - Create one in [OpenAI Platform → Settings → Organization → API keys](https://platform.openai.com/api-keys)
- **Claude**: Anthropic **Admin API key** (`sk-ant-admin...`)
  - ⚠️ **Important**: Standard API keys do not work. You need an admin key.
  - Create one in [Console → Settings → Admin keys](https://console.anthropic.com/settings/admin-keys)

## Installation

### As a CLI Tool (Development)

```bash
git clone <repository-url>
cd openai-and-claude-usage-report-generator
yarn install
```

### As an npm Package (Library)

```bash
yarn add openai-and-claude-usage-report-generator
# or
npm install openai-and-claude-usage-report-generator
```

## Configuration

Create a `.env` file in the root directory (see `.env.example` for a template).

⚠️ **Important**: Both platforms require **admin/administrative API keys**. Standard API keys will not work.

**OpenAI** (default):

```env
OPENAI_ADMIN_KEY=sk-...          # Must be an admin key, not a standard API key
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...
```

**Claude**:

```env
ANTHROPIC_ADMIN_API_KEY=sk-ant-admin-...  # Must be an admin key (starts with sk-ant-admin), not a standard API key
```

## Usage

### CLI Usage

Generate a report for a date range. Default provider is OpenAI.

```bash
yarn report 2024-01-01 2024-01-31
yarn report 2024-01-01 2024-01-31 --provider openai
yarn report 2024-01-01 2024-01-31 --provider claude
```

### Library Usage

Import and use the functions programmatically in your code:

```typescript
import {
  fetchOpenAICosts,
  fetchClaudeCosts,
  aggregateCosts,
  generateMarkdownReport,
  generateCSVReport,
  writeReports,
  parseDate,
  validateDateRange,
  loadConfig,
} from 'openai-and-claude-usage-report-generator';
import type { OpenAIReportConfig, ClaudeReportConfig } from 'openai-and-claude-usage-report-generator';

// Example: Fetch and process OpenAI costs
// Note: OPENAI_ADMIN_KEY must be an admin key, not a standard API key
async function generateOpenAIReport() {
  const config: OpenAIReportConfig = {
    provider: 'openai',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    apiKey: process.env.OPENAI_ADMIN_KEY!,  // Must be an admin key
    orgId: process.env.OPENAI_ORG_ID!,
    projectId: process.env.OPENAI_PROJECT_ID!,
  };

  // Fetch cost data
  const buckets = await fetchOpenAICosts(config);
  
  // Aggregate the data
  const aggregated = aggregateCosts(
    buckets,
    config.startDate,
    config.endDate,
    config.projectId
  );
  
  // Generate reports
  const markdown = generateMarkdownReport(aggregated, config.orgId, 'openai');
  const csv = generateCSVReport(aggregated);
  
  // Or write directly to files
  const { mdPath, csvPath } = writeReports(aggregated, config.orgId, 'openai');
  
  console.log(`Reports written to ${mdPath} and ${csvPath}`);
}

// Example: Fetch and process Claude costs
// Note: ANTHROPIC_ADMIN_API_KEY must be an admin key (sk-ant-admin...), not a standard API key
async function generateClaudeReport() {
  const config: ClaudeReportConfig = {
    provider: 'claude',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    apiKey: process.env.ANTHROPIC_ADMIN_API_KEY!,  // Must be an admin key (starts with sk-ant-admin)
  };

  const buckets = await fetchClaudeCosts(config);
  const aggregated = aggregateCosts(buckets, config.startDate, config.endDate, 'default');
  const markdown = generateMarkdownReport(aggregated, 'default', 'claude');
  
  console.log(markdown);
}
```

**Note**: When using as a library, you need to handle environment variables yourself. The `loadConfig` function is available but requires environment variables to be set, or you can construct the config objects directly as shown above.

⚠️ **Important Reminder**: Both platforms require **admin/administrative API keys**. Standard API keys will not work for accessing cost/usage data.

## Output

- **OpenAI**: `reports/openai/`
- **Claude**: `reports/claude/`

Each run produces:

- `usage-YYYY-MM-DD-to-YYYY-MM-DD.md` – Human-readable Markdown report
- `usage-YYYY-MM-DD-to-YYYY-MM-DD.csv` – CSV data export

## Report Contents

The Markdown report includes:

- **Summary**: Total cost, billing days, average daily cost
- **Cost by Model/Service**: Breakdown by line item with percentages
- **Daily Usage Breakdown**: Detailed daily costs by model/service
- **Total by Day**: Daily totals for quick overview

The CSV export contains:
- Date, line item, cost (USD), and project ID for each entry

## API Reference

### Core Functions

#### `fetchOpenAICosts(config: OpenAIReportConfig): Promise<CostBucket[]>`
Fetches cost data from OpenAI's organization costs API. Returns an array of cost buckets.

#### `fetchClaudeCosts(config: ClaudeReportConfig): Promise<CostBucket[]>`
Fetches cost data from Anthropic's cost report API. Returns an array of cost buckets (normalized to match OpenAI format).

#### `aggregateCosts(buckets: CostBucket[], startDate: string, endDate: string, projectId: string): AggregatedCosts`
Aggregates cost buckets into a structured format with totals, daily breakdowns, and line item summaries.

#### `generateMarkdownReport(aggregated: AggregatedCosts, orgId: string, provider: 'openai' | 'claude'): string`
Generates a human-readable Markdown report from aggregated costs.

#### `generateCSVReport(aggregated: AggregatedCosts): string`
Generates a CSV report from aggregated costs.

#### `writeReports(aggregated: AggregatedCosts, orgId: string, provider: Provider, baseDir?: string): { mdPath: string; csvPath: string }`
Writes both Markdown and CSV reports to disk. Returns paths to the generated files.

### Utility Functions

#### `parseDate(dateStr: string): Date`
Parses a date string in YYYY-MM-DD format and returns a Date object.

#### `validateDateRange(start: Date, end: Date): void`
Validates that the end date is after the start date. Throws an error if invalid.

#### `loadConfig(startDate: string, endDate: string, provider: Provider): ReportConfig`
Loads configuration from environment variables. Requires appropriate env vars to be set based on provider.

### Types

All TypeScript types are exported. Key types include:
- `OpenAIReportConfig` - Configuration for OpenAI API
- `ClaudeReportConfig` - Configuration for Claude API
- `AggregatedCosts` - Aggregated cost data structure
- `CostBucket` - Individual cost bucket from API
- `DailyCost` - Daily cost entry
- `Provider` - Union type: `'openai' | 'claude'`

## Development

### Running Tests

```bash
yarn test        # watch mode
yarn test:run    # single run (used by CI)
```

### Building

```bash
yarn build
```

### CI

GitHub Actions runs on push and pull requests to `main`: `yarn install --frozen-lockfile`, `yarn test:run`, then `yarn build`. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

