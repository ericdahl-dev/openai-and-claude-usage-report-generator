#!/usr/bin/env tsx

/**
 * OpenAI API Usage Report Generator
 *
 * Generates client billing reports from OpenAI organization costs API.
 * Outputs: Markdown (readable) and CSV (data) formats.
 *
 * Usage: yarn report YYYY-MM-DD YYYY-MM-DD
 */

import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { AggregatedCosts, CostsResponse, CostBucket, DailyCost, ReportConfig } from './types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OPENAI_API_BASE = 'https://api.openai.com/v1';

export function parseDate(dateStr: string): Date {
  if (!DATE_PATTERN.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }

  const date = new Date(dateStr + 'T00:00:00Z');

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Verify the date wasn't adjusted by checking it matches the input
  const isoDate = date.toISOString().split('T')[0];
  if (isoDate !== dateStr) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date;
}

export function validateDateRange(start: Date, end: Date): void {
  if (end <= start) {
    throw new Error('End date must be after start date');
  }
}

export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function parseArguments(): { startDate: string; endDate: string } {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    throw new Error(
      'Invalid arguments\n' +
        'Usage: yarn report YYYY-MM-DD YYYY-MM-DD\n' +
        'Example: yarn report 2024-01-01 2024-01-31'
    );
  }

  const [startDate, endDate] = args;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  validateDateRange(start, end);

  return { startDate, endDate };
}

export function loadConfig(startDate: string, endDate: string): ReportConfig {
  const requiredVars = [
    'OPENAI_ADMIN_KEY',
    'OPENAI_ORG_ID',
    'OPENAI_PROJECT_ID',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    startDate,
    endDate,
    apiKey: process.env.OPENAI_ADMIN_KEY!,
    orgId: process.env.OPENAI_ORG_ID!,
    projectId: process.env.OPENAI_PROJECT_ID!,
  };
}

export async function fetchCosts(config: ReportConfig): Promise<CostBucket[]> {
  const allBuckets: CostBucket[] = [];
  let nextPage: string | null = null;

  const startTime = toUnixTimestamp(parseDate(config.startDate));
  const endTime = toUnixTimestamp(parseDate(config.endDate));

  do {
    const params: Record<string, any> = {
      start_time: startTime,
      end_time: endTime,
      project_ids: [config.projectId],
      group_by: ['line_item'],
      limit: 180,
      bucket_width: '1d',
    };

    if (nextPage) {
      params.page = nextPage;
    }

    const response = await axios.get<CostsResponse>(
      `${OPENAI_API_BASE}/organization/costs`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Organization': config.orgId,
        },
      }
    );

    allBuckets.push(...response.data.data);
    nextPage = response.data.has_more ? response.data.next_page : null;

  } while (nextPage);

  return allBuckets;
}

export function aggregateCosts(
  buckets: CostBucket[],
  startDate: string,
  endDate: string,
  projectId: string
): AggregatedCosts {
  const dailyCosts: DailyCost[] = [];
  const costsByLineItem = new Map<string, number>();
  let totalCost = 0;

  for (const bucket of buckets) {
    const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];

    for (const result of bucket.results) {
      // Ensure cost is a number (API might return string)
      const cost = typeof result.amount.value === 'string'
        ? parseFloat(result.amount.value)
        : result.amount.value;
      const lineItem = result.line_item || 'unknown';

      totalCost += cost;

      // Aggregate by line item
      const currentLineItemCost = costsByLineItem.get(lineItem) || 0;
      costsByLineItem.set(lineItem, currentLineItemCost + cost);

      // Daily breakdown
      dailyCosts.push({
        date,
        lineItem,
        cost,
      });
    }
  }

  const billingDays = buckets.length;
  const averageDailyCost = billingDays > 0 ? totalCost / billingDays : 0;

  return {
    totalCost,
    startDate,
    endDate,
    projectId,
    dailyCosts,
    costsByLineItem,
    billingDays,
    averageDailyCost,
  };
}

export function generateMarkdownReport(aggregated: AggregatedCosts, orgId: string): string {
  const lines: string[] = [];

  // Header
  lines.push('# OpenAI API Usage Report');
  lines.push('');

  // Format dates
  const startDate = new Date(aggregated.startDate + 'T00:00:00Z');
  const endDate = new Date(aggregated.endDate + 'T00:00:00Z');
  const startFormatted = formatDateForReport(startDate, false);
  const endFormatted = formatDateForReport(endDate, true);
  const generated = new Date().toISOString();

  lines.push(`**Billing Period:** ${startFormatted} - ${endFormatted}`);
  lines.push(`**Project ID:** ${aggregated.projectId}`);
  lines.push(`**Organization:** ${orgId}`);
  lines.push(`**Generated:** ${generated}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Cost:** $${aggregated.totalCost.toFixed(2)} USD`);
  lines.push(`- **Billing Days:** ${aggregated.billingDays} days`);
  lines.push(`- **Average Daily Cost:** $${aggregated.averageDailyCost.toFixed(2)} USD`);
  lines.push('');

  // Cost by line item
  if (aggregated.costsByLineItem.size > 0) {
    lines.push('## Cost by Model/Service');
    lines.push('');
    lines.push('| Model/Service | Total Cost | % of Total |');
    lines.push('|---------------|-----------|------------|');

    // Sort by cost descending
    const sortedLineItems = Array.from(aggregated.costsByLineItem.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [lineItem, cost] of sortedLineItems) {
      const percentage = aggregated.totalCost > 0
        ? (cost / aggregated.totalCost * 100).toFixed(1)
        : '0.0';
      lines.push(`| ${lineItem} | $${cost.toFixed(2)} | ${percentage}% |`);
    }
    lines.push('');

    // Daily breakdown
    lines.push('## Daily Usage Breakdown');
    lines.push('');
    lines.push('| Date | Model/Service | Cost (USD) |');
    lines.push('|------|---------------|-----------|');

    for (const daily of aggregated.dailyCosts) {
      lines.push(`| ${daily.date} | ${daily.lineItem} | $${daily.cost.toFixed(2)} |`);
    }
    lines.push('');

    // Daily totals
    lines.push('## Total by Day');
    lines.push('');
    lines.push('| Date | Total Cost |');
    lines.push('|------|-----------|');

    const dailyTotals = new Map<string, number>();
    for (const daily of aggregated.dailyCosts) {
      const current = dailyTotals.get(daily.date) || 0;
      dailyTotals.set(daily.date, current + daily.cost);
    }

    const sortedDates = Array.from(dailyTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [date, total] of sortedDates) {
      lines.push(`| ${date} | $${total.toFixed(2)} |`);
    }
    lines.push('');
  } else {
    lines.push('No usage data for this period.');
    lines.push('');
  }

  return lines.join('\n');
}

function formatDateForReport(date: Date, includeYear: boolean): string {
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const year = date.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });

  if (includeYear) {
    return `${month} ${day}, ${year}`;
  }
  return `${month} ${day}`;
}

export function generateCSVReport(aggregated: AggregatedCosts): string {
  const lines: string[] = [];

  // Header
  lines.push('date,line_item,cost_usd,project_id');

  // Sort by date then line item
  const sortedDailyCosts = [...aggregated.dailyCosts].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.lineItem.localeCompare(b.lineItem);
  });

  // Data rows
  for (const daily of sortedDailyCosts) {
    const lineItem = escapeCSV(daily.lineItem);
    lines.push(`${daily.date},${lineItem},${daily.cost.toFixed(2)},${aggregated.projectId}`);
  }

  return lines.join('\n') + '\n';
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function ensureReportsDirectory() {
  const reportsDir = path.join(process.cwd(), 'reports', 'openai');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir;
}

function writeReports(aggregated: AggregatedCosts, orgId: string): { mdPath: string; csvPath: string } {
  const reportsDir = ensureReportsDirectory();

  const baseFilename = `usage-${aggregated.startDate}-to-${aggregated.endDate}`;
  const mdPath = path.join(reportsDir, `${baseFilename}.md`);
  const csvPath = path.join(reportsDir, `${baseFilename}.csv`);

  // Generate reports
  const markdown = generateMarkdownReport(aggregated, orgId);
  const csv = generateCSVReport(aggregated);

  // Write files
  fs.writeFileSync(mdPath, markdown, 'utf8');
  fs.writeFileSync(csvPath, csv, 'utf8');

  return { mdPath, csvPath };
}

function displayTerminalSummary(aggregated: AggregatedCosts, mdPath: string, csvPath: string) {
  console.log('OpenAI API Usage Report');
  console.log('=======================');
  console.log(`Period: ${aggregated.startDate} to ${aggregated.endDate}`);
  console.log(`Project: ${aggregated.projectId}\n`);

  console.log(`Total Cost: $${aggregated.totalCost.toFixed(2)} USD`);
  console.log(`Total Days: ${aggregated.billingDays}`);
  console.log(`Average Daily Cost: $${aggregated.averageDailyCost.toFixed(2)}\n`);

  if (aggregated.costsByLineItem.size > 0) {
    console.log('Top Models/Services:');
    const sortedLineItems = Array.from(aggregated.costsByLineItem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [lineItem, cost] of sortedLineItems) {
      console.log(`  ${lineItem}: $${cost.toFixed(2)}`);
    }
    console.log('');
  }

  console.log('Reports generated:');
  console.log(`  - ${mdPath}`);
  console.log(`  - ${csvPath}`);
}

async function main() {
  console.log('OpenAI API Usage Report');
  console.log('=======================\n');

  try {
    const { startDate, endDate } = parseArguments();
    const config = loadConfig(startDate, endDate);

    console.log(`Fetching costs from ${startDate} to ${endDate}...`);

    const buckets = await fetchCosts(config);
    console.log(`Received ${buckets.length} daily buckets\n`);

    const aggregated = aggregateCosts(buckets, startDate, endDate, config.projectId);
    const { mdPath, csvPath } = writeReports(aggregated, config.orgId);
    console.log('');
    displayTerminalSummary(aggregated, mdPath, csvPath);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.message.includes('OPENAI_ADMIN_KEY')) {
        console.error('\nHint: Make sure OPENAI_ADMIN_KEY is set in your environment.');
      } else if (error.message.includes('OPENAI_ORG_ID')) {
        console.error('\nHint: Make sure OPENAI_ORG_ID is set in your environment.');
      } else if (error.message.includes('OPENAI_PROJECT_ID')) {
        console.error('\nHint: Make sure OPENAI_PROJECT_ID is set in your environment.');
      }
    }
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
