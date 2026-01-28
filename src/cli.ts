#!/usr/bin/env tsx

/**
 * CLI Entry Point
 *
 * Command-line interface for generating usage reports.
 * Imports functionality from the library entry point.
 *
 * Usage: yarn report YYYY-MM-DD YYYY-MM-DD [--provider openai|claude]
 */

import 'dotenv/config';
import {
  fetchOpenAICosts,
  fetchClaudeCosts,
  aggregateCosts,
  writeReports,
  postJSONReport,
  generateJSONReport,
  loadConfig,
  parseDate,
  validateDateRange,
  type AggregatedCosts,
  type Provider,
} from './index.js';

const USAGE =
  'Usage: yarn report YYYY-MM-DD YYYY-MM-DD [--provider openai|claude] [--post-url URL]\n' +
  'Example: yarn report 2024-01-01 2024-01-31\n' +
  'Example: yarn report 2024-01-01 2024-01-31 --provider claude\n' +
  'Example: yarn report 2024-01-01 2024-01-31 --post-url https://example.com/api/reports';

export function parseArguments(): { startDate: string; endDate: string; provider: Provider; postUrl?: string } {
  const args = process.argv.slice(2);
  const providerIdx = args.indexOf('--provider');
  const postUrlIdx = args.indexOf('--post-url');
  
  const providerArg = providerIdx >= 0 && args[providerIdx + 1] != null ? args[providerIdx + 1] : null;
  const postUrlArg = postUrlIdx >= 0 && args[postUrlIdx + 1] != null ? args[postUrlIdx + 1] : null;
  
  // Filter out all flag arguments (only when flags are present)
  const filtered = args.filter((_, i) => {
    if (providerIdx >= 0 && (i === providerIdx || i === providerIdx + 1)) return false;
    if (postUrlIdx >= 0 && (i === postUrlIdx || i === postUrlIdx + 1)) return false;
    return true;
  });

  if (filtered.length !== 2) {
    throw new Error(`Invalid arguments\n${USAGE}`);
  }

  const provider: Provider =
    providerArg === 'claude' ? 'claude' : providerArg === 'openai' ? 'openai' : 'openai';
  if (providerArg != null && providerArg !== 'openai' && providerArg !== 'claude') {
    throw new Error(`Invalid --provider: ${providerArg}. Use openai or claude.\n${USAGE}`);
  }

  const [startDate, endDate] = filtered;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  validateDateRange(start, end);

  return { startDate, endDate, provider, postUrl: postUrlArg || undefined };
}

function displayTerminalSummary(
  aggregated: AggregatedCosts,
  mdPath: string,
  csvPath: string,
  jsonPath: string,
  provider: Provider
) {
  const title = provider === 'claude' ? 'Claude API Usage Report' : 'OpenAI API Usage Report';
  console.log(title);
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
  console.log(`  - ${jsonPath}`);
}

async function main() {
  try {
    const { startDate, endDate, provider, postUrl } = parseArguments();
    const config = loadConfig(startDate, endDate, provider);

    const title = provider === 'claude' ? 'Claude API Usage Report' : 'OpenAI API Usage Report';
    console.log(title);
    console.log('=======================\n');
    console.log(`Fetching costs from ${startDate} to ${endDate}...`);

    const buckets =
      config.provider === 'openai'
        ? await fetchOpenAICosts(config)
        : await fetchClaudeCosts(config);
    console.log(`Received ${buckets.length} daily buckets\n`);

    const projectId = config.provider === 'openai' ? config.projectId : 'default';
    const orgId = config.provider === 'openai' ? config.orgId : 'default';
    const aggregated = aggregateCosts(buckets, startDate, endDate, projectId);
    const { mdPath, csvPath, jsonPath } = writeReports(aggregated, orgId, provider);
    
    // Optionally POST JSON to URL
    if (postUrl) {
      console.log(`Posting JSON report to ${postUrl}...`);
      const jsonReport = generateJSONReport(aggregated, orgId, provider);
      try {
        await postJSONReport(jsonReport, postUrl);
        console.log('Successfully posted JSON report\n');
      } catch (error) {
        console.error(`Failed to post JSON report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    
    console.log('');
    displayTerminalSummary(aggregated, mdPath, csvPath, jsonPath, provider);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.message.includes('OPENAI_ADMIN_KEY')) {
        console.error('\nHint: Make sure OPENAI_ADMIN_KEY is set in your environment.');
      } else if (error.message.includes('OPENAI_ORG_ID')) {
        console.error('\nHint: Make sure OPENAI_ORG_ID is set in your environment.');
      } else if (error.message.includes('OPENAI_PROJECT_ID')) {
        console.error('\nHint: Make sure OPENAI_PROJECT_ID is set in your environment.');
      } else if (error.message.includes('ANTHROPIC_ADMIN_API_KEY')) {
        console.error('\nHint: Make sure ANTHROPIC_ADMIN_API_KEY is set in your environment.');
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
