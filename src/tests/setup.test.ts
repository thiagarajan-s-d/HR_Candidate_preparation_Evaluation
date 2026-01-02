/**
 * Basic test to verify testing infrastructure is working
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Testing Infrastructure', () => {
  it('should run basic unit tests', () => {
    expect(true).toBe(true);
  });

  it('should run property-based tests with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it('should support TypeScript', () => {
    const testValue: string = 'TypeScript works';
    expect(testValue).toBe('TypeScript works');
  });
});
