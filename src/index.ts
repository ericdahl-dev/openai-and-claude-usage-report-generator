/**
 * Library Entry Point
 *
 * Exports all public API functions and types for programmatic use.
 * This is the main entry point when using this package as a library.
 */

// Re-export all types
export type {
  AggregatedCosts,
  ClaudeCostBucket,
  ClaudeCostReport,
  ClaudeCostResult,
  ClaudeReportConfig,
  CostBucket,
  CostsResponse,
  DailyCost,
  OpenAIReportConfig,
  Provider,
  ReportConfig,
} from './types.js';

// Re-export public utility functions
export {
  parseDate,
  validateDateRange,
  loadConfig,
  aggregateCosts,
  generateMarkdownReport,
  generateCSVReport,
  generateJSONReport,
  writeReports,
  postJSONReport,
  fetchOpenAICosts,
  fetchClaudeCosts,
} from './usage-report.js';
