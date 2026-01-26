import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import type {
  AggregatedCosts,
  CostBucket,
  ClaudeReportConfig,
  OpenAIReportConfig,
} from './types.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  aggregateCosts,
  fetchClaudeCosts,
  fetchCosts,
  generateCSVReport,
  generateMarkdownReport,
  loadConfig,
  parseArguments,
  parseDate,
  validateDateRange,
  writeReports,
} from './usage-report.js';

vi.mock('axios');

describe('parseDate', () => {
  it('parses valid YYYY-MM-DD', () => {
    const d = parseDate('2024-01-15');
    expect(d.toISOString().startsWith('2024-01-15')).toBe(true);
  });

  it('throws on invalid format', () => {
    expect(() => parseDate('01-15-2024')).toThrow('Invalid date format');
    expect(() => parseDate('2024/01/15')).toThrow('Invalid date format');
  });

  it('throws on invalid date', () => {
    expect(() => parseDate('2024-02-30')).toThrow('Invalid date');
  });
});

describe('validateDateRange', () => {
  it('accepts end > start', () => {
    expect(() =>
      validateDateRange(parseDate('2024-01-01'), parseDate('2024-01-31'))
    ).not.toThrow();
  });

  it('throws when end <= start', () => {
    expect(() =>
      validateDateRange(parseDate('2024-01-31'), parseDate('2024-01-01'))
    ).toThrow('End date must be after start date');
    expect(() =>
      validateDateRange(parseDate('2024-01-15'), parseDate('2024-01-15'))
    ).toThrow('End date must be after start date');
  });
});

describe('parseArguments', () => {
  const defaultArgv = ['node', 'report'];

  function runWithArgv(args: string[]) {
    const orig = process.argv;
    process.argv = [...defaultArgv, ...args];
    try {
      return parseArguments();
    } finally {
      process.argv = orig;
    }
  }

  it('parses start and end only, default provider openai', () => {
    expect(runWithArgv(['2024-01-01', '2024-01-31'])).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      provider: 'openai',
    });
  });

  it('parses --provider claude', () => {
    expect(runWithArgv(['2024-01-01', '2024-01-31', '--provider', 'claude'])).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      provider: 'claude',
    });
  });

  it('parses --provider openai', () => {
    expect(runWithArgv(['2024-01-01', '2024-01-31', '--provider', 'openai'])).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      provider: 'openai',
    });
  });

  it('throws on invalid --provider', () => {
    expect(() =>
      runWithArgv(['2024-01-01', '2024-01-31', '--provider', 'gpt'])
    ).toThrow('Invalid --provider');
  });

  it('throws when not exactly two date args', () => {
    expect(() => runWithArgv(['2024-01-01'])).toThrow('Invalid arguments');
    expect(() => runWithArgv(['2024-01-01', '2024-01-31', '2024-02-01'])).toThrow(
      'Invalid arguments'
    );
  });

  it('throws when dates invalid or range reversed', () => {
    expect(() => runWithArgv(['2024-01-31', '2024-01-01'])).toThrow(
      'End date must be after start date'
    );
  });
});

describe('loadConfig', () => {
  const openaiVars = {
    OPENAI_ADMIN_KEY: 'sk-openai',
    OPENAI_ORG_ID: 'org-x',
    OPENAI_PROJECT_ID: 'proj-y',
  };
  const claudeVar = { ANTHROPIC_ADMIN_API_KEY: 'sk-ant-admin-x' };

  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns OpenAI config when provider openai and vars set', () => {
    Object.assign(process.env, openaiVars);
    const c = loadConfig('2024-01-01', '2024-01-31', 'openai');
    expect(c).toMatchObject({
      provider: 'openai',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-openai',
      orgId: 'org-x',
      projectId: 'proj-y',
    });
  });

  it('throws on missing OpenAI vars', () => {
    delete process.env.OPENAI_ADMIN_KEY;
    delete process.env.OPENAI_ORG_ID;
    delete process.env.OPENAI_PROJECT_ID;
    expect(() => loadConfig('2024-01-01', '2024-01-31', 'openai')).toThrow(
      'Missing required environment variable'
    );
    process.env.OPENAI_ADMIN_KEY = 'sk';
    expect(() => loadConfig('2024-01-01', '2024-01-31', 'openai')).toThrow(
      'Missing required environment variable'
    );
  });

  it('returns Claude config when provider claude and var set', () => {
    process.env.ANTHROPIC_ADMIN_API_KEY = 'sk-ant-admin-x';
    const c = loadConfig('2024-01-01', '2024-01-31', 'claude');
    expect(c).toMatchObject({
      provider: 'claude',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-ant-admin-x',
    });
    expect(c).not.toHaveProperty('orgId');
    expect(c).not.toHaveProperty('projectId');
  });

  it('throws on missing ANTHROPIC_ADMIN_API_KEY for Claude', () => {
    delete process.env.ANTHROPIC_ADMIN_API_KEY;
    expect(() => loadConfig('2024-01-01', '2024-01-31', 'claude')).toThrow(
      'ANTHROPIC_ADMIN_API_KEY'
    );
  });
});

describe('aggregateCosts', () => {
  it('aggregates OpenAI-style buckets', () => {
    const buckets: CostBucket[] = [
      {
        object: 'bucket',
        start_time: new Date('2024-01-01T00:00:00Z').getTime() / 1000,
        end_time: new Date('2024-01-02T00:00:00Z').getTime() / 1000,
        results: [
          {
            object: 'organization.costs.result',
            amount: { value: 1.5, currency: 'USD' },
            line_item: 'gpt-4',
            project_id: 'proj_1',
          },
          {
            object: 'organization.costs.result',
            amount: { value: '0.5', currency: 'USD' },
            line_item: 'gpt-3.5',
            project_id: 'proj_1',
          },
        ],
      },
    ];
    const a = aggregateCosts(buckets, '2024-01-01', '2024-01-31', 'proj_1');
    expect(a.totalCost).toBe(2);
    expect(a.billingDays).toBe(1);
    expect(a.projectId).toBe('proj_1');
    expect(a.costsByLineItem.get('gpt-4')).toBe(1.5);
    expect(a.costsByLineItem.get('gpt-3.5')).toBe(0.5);
    expect(a.dailyCosts).toHaveLength(2);
  });

  it('aggregates Claude-style normalized buckets (CostBucket shape)', () => {
    const buckets: CostBucket[] = [
      {
        object: 'bucket',
        start_time: new Date('2024-01-01T00:00:00Z').getTime() / 1000,
        end_time: new Date('2024-01-02T00:00:00Z').getTime() / 1000,
        results: [
          {
            object: 'organization.costs.result',
            amount: { value: 1.2378, currency: 'USD' },
            line_item: 'Claude Sonnet 4 Usage - Input Tokens',
            project_id: null,
          },
        ],
      },
    ];
    const a = aggregateCosts(buckets, '2024-01-01', '2024-01-31', 'default');
    expect(a.totalCost).toBeCloseTo(1.2378);
    expect(a.projectId).toBe('default');
    expect(a.costsByLineItem.get('Claude Sonnet 4 Usage - Input Tokens')).toBeCloseTo(1.2378);
  });
});

describe('generateMarkdownReport', () => {
  const baseAggregated: AggregatedCosts = {
    totalCost: 10,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    projectId: 'proj_1',
    dailyCosts: [{ date: '2024-01-01', lineItem: 'gpt-4', cost: 10 }],
    costsByLineItem: new Map([['gpt-4', 10]]),
    billingDays: 1,
    averageDailyCost: 10,
  };

  it('uses OpenAI title when provider openai', () => {
    const md = generateMarkdownReport(baseAggregated, 'org-x', 'openai');
    expect(md).toContain('# OpenAI API Usage Report');
    expect(md).toContain('**Organization:** org-x');
  });

  it('uses Claude title when provider claude', () => {
    const md = generateMarkdownReport(baseAggregated, 'default', 'claude');
    expect(md).toContain('# Claude API Usage Report');
    expect(md).toContain('**Organization:** default');
  });
});

describe('generateCSVReport', () => {
  it('emits date, line_item, cost_usd, project_id', () => {
    const a: AggregatedCosts = {
      totalCost: 5,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      projectId: 'default',
      dailyCosts: [
        { date: '2024-01-01', lineItem: 'gpt-4', cost: 3 },
        { date: '2024-01-01', lineItem: 'gpt-3.5', cost: 2 },
      ],
      costsByLineItem: new Map([
        ['gpt-4', 3],
        ['gpt-3.5', 2],
      ]),
      billingDays: 1,
      averageDailyCost: 5,
    };
    const csv = generateCSVReport(a);
    expect(csv).toContain('date,line_item,cost_usd,project_id');
    expect(csv).toContain('2024-01-01,gpt-3.5,2.00,default');
    expect(csv).toContain('2024-01-01,gpt-4,3.00,default');
  });
});

describe('fetchCosts (OpenAI)', () => {
  const mockCostsResponse = {
    data: {
      object: 'page',
      data: [
        {
          object: 'bucket',
          start_time: new Date('2024-01-01T00:00:00Z').getTime() / 1000,
          end_time: new Date('2024-01-02T00:00:00Z').getTime() / 1000,
          results: [
            {
              object: 'organization.costs.result',
              amount: { value: 2.5, currency: 'USD' },
              line_item: 'gpt-4',
              project_id: 'proj_1',
            },
          ],
        },
      ],
      has_more: false,
      next_page: null,
    },
  };

  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue(mockCostsResponse as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls organization/costs with correct headers and params', async () => {
    const config: OpenAIReportConfig = {
      provider: 'openai',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-openai',
      orgId: 'org-x',
      projectId: 'proj_y',
    };
    await fetchCosts(config);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/organization/costs'),
      expect.objectContaining({
        params: expect.objectContaining({
          start_time: expect.any(Number),
          end_time: expect.any(Number),
          project_ids: ['proj_y'],
          group_by: ['line_item'],
          bucket_width: '1d',
          limit: 180,
        }),
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-openai',
          'OpenAI-Organization': 'org-x',
        }),
      })
    );
  });

  it('returns CostBucket[] from response', async () => {
    const config: OpenAIReportConfig = {
      provider: 'openai',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-openai',
      orgId: 'org-x',
      projectId: 'proj_y',
    };
    const buckets = await fetchCosts(config);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].results).toHaveLength(1);
    expect(buckets[0].results[0].amount.value).toBe(2.5);
    expect(buckets[0].results[0].line_item).toBe('gpt-4');
  });

  it('paginates when has_more is true', async () => {
    const bucket1 = {
      object: 'bucket',
      start_time: new Date('2024-01-01T00:00:00Z').getTime() / 1000,
      end_time: new Date('2024-01-02T00:00:00Z').getTime() / 1000,
      results: [
        {
          object: 'organization.costs.result',
          amount: { value: 1, currency: 'USD' },
          line_item: 'gpt-4',
          project_id: 'proj_1',
        },
      ],
    };
    const bucket2 = {
      ...bucket1,
      start_time: new Date('2024-01-02T00:00:00Z').getTime() / 1000,
      end_time: new Date('2024-01-03T00:00:00Z').getTime() / 1000,
    };
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          object: 'page',
          data: [bucket1],
          has_more: true,
          next_page: 'page_2',
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          object: 'page',
          data: [bucket2],
          has_more: false,
          next_page: null,
        },
      } as any);
    const config: OpenAIReportConfig = {
      provider: 'openai',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-openai',
      orgId: 'org-x',
      projectId: 'proj_y',
    };
    const buckets = await fetchCosts(config);
    expect(buckets).toHaveLength(2);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ params: expect.objectContaining({ page: 'page_2' }) })
    );
  });
});

describe('fetchClaudeCosts', () => {
  const mockCostReport = {
    data: {
      data: [
        {
          starting_at: '2024-01-01T00:00:00Z',
          ending_at: '2024-01-02T00:00:00Z',
          results: [
            {
              amount: '123.45',
              currency: 'USD',
              description: 'Claude Sonnet 4 Usage - Input Tokens',
              model: 'claude-sonnet-4',
              cost_type: 'tokens',
              context_window: null,
              token_type: null,
              service_tier: null,
              workspace_id: null,
            },
          ],
        },
      ],
      has_more: false,
      next_page: null,
    },
  };

  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue(mockCostReport as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls cost_report with correct headers and params', async () => {
    const config: ClaudeReportConfig = {
      provider: 'claude',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-ant-admin-test',
    };
    await fetchClaudeCosts(config);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/organizations/cost_report'),
      expect.objectContaining({
        params: expect.objectContaining({
          starting_at: '2024-01-01T00:00:00.000Z',
          ending_at: '2024-01-31T00:00:00.000Z',
          bucket_width: '1d',
          limit: 31,
        }),
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-admin-test',
          'anthropic-version': '2023-06-01',
        }),
      })
    );
  });

  it('normalizes response: cents to dollars, description to line_item', async () => {
    const config: ClaudeReportConfig = {
      provider: 'claude',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-ant-admin-test',
    };
    const buckets = await fetchClaudeCosts(config);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].results).toHaveLength(1);
    expect(buckets[0].results[0].amount.value).toBeCloseTo(1.2345);
    expect(buckets[0].results[0].line_item).toBe('Claude Sonnet 4 Usage - Input Tokens');
  });

  it('paginates when has_more is true', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              starting_at: '2024-01-01T00:00:00Z',
              ending_at: '2024-01-02T00:00:00Z',
              results: [
                {
                  amount: '100',
                  currency: 'USD',
                  description: 'Page 1',
                  model: null,
                  cost_type: null,
                  context_window: null,
                  token_type: null,
                  service_tier: null,
                  workspace_id: null,
                },
              ],
            },
          ],
          has_more: true,
          next_page: 'cursor_2',
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              starting_at: '2024-01-02T00:00:00Z',
              ending_at: '2024-01-03T00:00:00Z',
              results: [
                {
                  amount: '200',
                  currency: 'USD',
                  description: 'Page 2',
                  model: null,
                  cost_type: null,
                  context_window: null,
                  token_type: null,
                  service_tier: null,
                  workspace_id: null,
                },
              ],
            },
          ],
          has_more: false,
          next_page: null,
        },
      } as any);
    const config: ClaudeReportConfig = {
      provider: 'claude',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-ant-admin-test',
    };
    const buckets = await fetchClaudeCosts(config);
    expect(buckets).toHaveLength(2);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ params: expect.objectContaining({ page: 'cursor_2' }) })
    );
  });

  it('uses model + cost_type when description is null, else unknown', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            starting_at: '2024-01-01T00:00:00Z',
            ending_at: '2024-01-02T00:00:00Z',
            results: [
              {
                amount: '100',
                currency: 'USD',
                description: null,
                model: 'claude-3-opus',
                cost_type: 'tokens',
                context_window: null,
                token_type: null,
                service_tier: null,
                workspace_id: null,
              },
              {
                amount: '50',
                currency: 'USD',
                description: null,
                model: null,
                cost_type: null,
                context_window: null,
                token_type: null,
                service_tier: null,
                workspace_id: null,
              },
            ],
          },
        ],
        has_more: false,
        next_page: null,
      },
    } as any);
    const config: ClaudeReportConfig = {
      provider: 'claude',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      apiKey: 'sk-ant-admin-test',
    };
    const buckets = await fetchClaudeCosts(config);
    expect(buckets[0].results[0].line_item).toBe('claude-3-opus tokens');
    expect(buckets[0].results[1].line_item).toBe('unknown');
  });
});

describe('writeReports', () => {
  const aggregated: AggregatedCosts = {
    totalCost: 5,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    projectId: 'proj_1',
    dailyCosts: [{ date: '2024-01-01', lineItem: 'gpt-4', cost: 5 }],
    costsByLineItem: new Map([['gpt-4', 5]]),
    billingDays: 1,
    averageDailyCost: 5,
  };

  it('writes to reports/openai when provider openai', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-report-'));
    try {
      const { mdPath, csvPath } = writeReports(aggregated, 'org-x', 'openai', tmp);
      expect(mdPath).toContain(path.join('reports', 'openai'));
      expect(csvPath).toContain(path.join('reports', 'openai'));
      expect(fs.existsSync(mdPath)).toBe(true);
      expect(fs.existsSync(csvPath)).toBe(true);
      expect(fs.readFileSync(mdPath, 'utf8')).toContain('# OpenAI API Usage Report');
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  it('writes to reports/claude when provider claude', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-report-'));
    try {
      const { mdPath, csvPath } = writeReports(aggregated, 'default', 'claude', tmp);
      expect(mdPath).toContain(path.join('reports', 'claude'));
      expect(csvPath).toContain(path.join('reports', 'claude'));
      expect(fs.existsSync(mdPath)).toBe(true);
      expect(fs.existsSync(csvPath)).toBe(true);
      expect(fs.readFileSync(mdPath, 'utf8')).toContain('# Claude API Usage Report');
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});
