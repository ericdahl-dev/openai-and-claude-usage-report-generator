import { describe, expect, it } from 'vitest';

/**
 * Integration tests to verify both CLI and library usage patterns work
 */

describe('Integration: CLI and Library Usage', () => {
  it('should allow importing CLI functions', async () => {
    const cli = await import('./cli.js');
    
    // Verify CLI-specific functions are available
    expect(typeof cli.parseArguments).toBe('function');
  });

  it('should allow importing library functions', async () => {
    const lib = await import('./index.js');
    
    // Verify core library functions are available
    expect(typeof lib.fetchOpenAICosts).toBe('function');
    expect(typeof lib.fetchClaudeCosts).toBe('function');
    expect(typeof lib.aggregateCosts).toBe('function');
    expect(typeof lib.generateMarkdownReport).toBe('function');
    expect(typeof lib.generateCSVReport).toBe('function');
    expect(typeof lib.writeReports).toBe('function');
    expect(typeof lib.parseDate).toBe('function');
    expect(typeof lib.validateDateRange).toBe('function');
    expect(typeof lib.loadConfig).toBe('function');
  });

  it('should allow importing types from library', async () => {
    const lib = await import('./index.js');
    
    // Types are available at compile time, but we can verify the module exports
    expect(lib).toBeDefined();
  });

  it('should have CLI import from library (verify separation)', async () => {
    // This test verifies that cli.ts imports from index.ts (the library)
    // We can't directly test imports, but we can verify both modules work
    const cli = await import('./cli.js');
    const lib = await import('./index.js');
    
    // Both should be importable
    expect(cli).toBeDefined();
    expect(lib).toBeDefined();
    
    // CLI should have parseArguments (CLI-specific)
    expect(typeof cli.parseArguments).toBe('function');
    
    // Library should have core functions but NOT CLI functions
    expect(typeof lib.fetchOpenAICosts).toBe('function');
    expect('parseArguments' in lib).toBe(false);
  });
});
