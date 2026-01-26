# OpenAI Usage Report Generator

A standalone tool for generating billing reports from the **OpenAI** or **Claude (Anthropic)** cost APIs. Outputs Markdown (readable) and CSV (data) reports.

## Features

- Fetches usage/cost data from OpenAI's organization costs API or Anthropic's [Usage and Cost API](https://platform.claude.com/docs/en/build-with-claude/usage-cost-api)
- Generates detailed Markdown reports with summaries and breakdowns
- Exports CSV data for further analysis
- Daily and line-item cost breakdowns

## Prerequisites

- Node.js 18+ and Yarn (`.nvmrc` specifies 22)
- **OpenAI**: API admin key, Organization ID, and Project ID
- **Claude**: Anthropic **Admin API key** (`sk-ant-admin...`). Standard API keys do not work; create one in [Console → Settings → Admin keys](https://console.anthropic.com/settings/admin-keys).

## Installation

```bash
yarn install
```

## Configuration

Create a `.env` file in the root directory (see `.env.example` for a template).

**OpenAI** (default):

```env
OPENAI_ADMIN_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...
```

**Claude**:

```env
ANTHROPIC_ADMIN_API_KEY=sk-ant-admin-...
```

## Usage

Generate a report for a date range. Default provider is OpenAI.

```bash
yarn report 2024-01-01 2024-01-31
yarn report 2024-01-01 2024-01-31 --provider openai
yarn report 2024-01-01 2024-01-31 --provider claude
```

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

