# OpenAI Usage Report Generator

A standalone tool for generating billing reports from the OpenAI organization costs API. Generates both Markdown (readable) and CSV (data) format reports.

## Features

- Fetches usage data from OpenAI's organization costs API
- Generates detailed Markdown reports with summaries and breakdowns
- Exports CSV data for further analysis
- Daily and line-item cost breakdowns

## Prerequisites

- Node.js 18+ and Yarn
- OpenAI API admin key with access to organization costs API
- OpenAI Organization ID and Project ID

## Installation

```bash
yarn install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
OPENAI_ADMIN_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_PROJECT_ID=proj_...
```

## Usage

Generate a report for a date range:

```bash
yarn report 2024-01-01 2024-01-31
```

## Output

Reports are generated in the `reports/openai/` directory:

- `usage-YYYY-MM-DD-to-YYYY-MM-DD.md` - Human-readable Markdown report
- `usage-YYYY-MM-DD-to-YYYY-MM-DD.csv` - CSV data export

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
yarn test
```

### Building

```bash
yarn build
```

