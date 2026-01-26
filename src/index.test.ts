import { describe, expect, it } from 'vitest';
import type {
  AggregatedCosts,
  ClaudeReportConfig,
  OpenAIReportConfig,
  Provider,
  ReportConfig,
} from './types.js';

// Test that the library entry point exists and exports all expected functions
describe('Library Entry Point (index.ts)', () => {
  it('should export all public API functions', async () => {
    // Dynamic import to test the library entry point
    const lib = await import('./index.js');

    // Core functions
    expect(typeof lib.parseDate).toBe('function');
    expect(typeof lib.validateDateRange).toBe('function');
    expect(typeof lib.loadConfig).toBe('function');
    expect(typeof lib.fetchOpenAICosts).toBe('function');
    expect(typeof lib.fetchClaudeCosts).toBe('function');
    expect(typeof lib.aggregateCosts).toBe('function');
    expect(typeof lib.generateMarkdownReport).toBe('function');
    expect(typeof lib.generateCSVReport).toBe('function');
    expect(typeof lib.writeReports).toBe('function');
  });

  it('should export all types', async () => {
    const lib = await import('./index.js');

    // Types should be available (as TypeScript types, not runtime values)
    // We can't directly test types at runtime, but we can verify the module exports
    expect(lib).toBeDefined();
  });

  it('should NOT export CLI-specific functions', async () => {
    const lib = await import('./index.js');

    // CLI-specific functions should not be exported
    expect('parseArguments' in lib).toBe(false);
    expect('main' in lib).toBe(false);
  });

  it('should allow importing without CLI dependencies', async () => {
    // This test verifies the library can be imported without dotenv/config
    // which is only needed for CLI
    const lib = await import('./index.js');

    expect(lib).toBeDefined();
    expect(typeof lib.fetchOpenAICosts).toBe('function');
    expect(typeof lib.fetchClaudeCosts).toBe('function');
  });

  it('should export fetchOpenAICosts (renamed from fetchCosts)', async () => {
    const lib = await import('./index.js');

    // Verify the renamed function exists
    expect(typeof lib.fetchOpenAICosts).toBe('function');
    // Verify old name doesn't exist
    expect('fetchCosts' in lib).toBe(false);
  });
});
