/**
 * OpenAI Organization Costs API Types
 * https://platform.openai.com/docs/api-reference/usage
 */

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

export interface ReportConfig {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  apiKey: string;
  orgId: string;
  projectId: string;
}
