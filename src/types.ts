/**
 * OpenAI Organization Costs API Types
 * https://platform.openai.com/docs/api-reference/usage
 *
 * Claude (Anthropic) Cost API Types
 * https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
 */

export type Provider = 'openai' | 'claude';

export interface CostsResponse {
  object: 'page';
  data: CostBucket[];
  has_more: boolean;
  next_page: string | null;
}

export interface CostBucket {
  object: 'bucket';
  start_time: number;  // Unix timestamp
  end_time: number;    // Unix timestamp
  results: CostResult[];
}

export interface CostResult {
  object: 'organization.costs.result';
  amount: {
    value: number | string;
    currency: string;
  };
  line_item: string | null;  // Model/service name (e.g., "gpt-4")
  project_id: string | null;
}

/** Anthropic cost_report API response (raw). */
export interface ClaudeCostReport {
  data: ClaudeCostBucket[];
  has_more: boolean;
  next_page: string | null;
}

export interface ClaudeCostBucket {
  starting_at: string;  // RFC 3339
  ending_at: string;
  results: ClaudeCostResult[];
}

export interface ClaudeCostResult {
  amount: string;       // Cents (lowest currency units)
  currency: string;
  description: string | null;
  model: string | null;
  cost_type: string | null;
  context_window: string | null;
  token_type: string | null;
  service_tier: string | null;
  workspace_id: string | null;
}

export interface AggregatedCosts {
  totalCost: number;
  startDate: string;
  endDate: string;
  projectId: string;
  dailyCosts: DailyCost[];
  costsByLineItem: Map<string, number>;
  billingDays: number;
  averageDailyCost: number;
}

export interface DailyCost {
  date: string;  // YYYY-MM-DD
  lineItem: string;
  cost: number;
}

export interface OpenAIReportConfig {
  provider: 'openai';
  startDate: string;
  endDate: string;
  apiKey: string;
  orgId: string;
  projectId: string;
}

export interface ClaudeReportConfig {
  provider: 'claude';
  startDate: string;
  endDate: string;
  apiKey: string;
}

export type ReportConfig = OpenAIReportConfig | ClaudeReportConfig;
