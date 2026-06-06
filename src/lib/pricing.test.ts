import { describe, expect, it } from 'vitest';
import { getRegionalPriceRanking } from './pricing';

describe('regional pricing', () => {
  it('sorts ChatGPT Plus region prices from low to high', () => {
    const rows = getRegionalPriceRanking();

    expect(rows.length).toBeGreaterThan(5);
    expect(rows[0].cnyMonthly).toBeLessThanOrEqual(rows[1].cnyMonthly);
    expect(rows.map((row) => row.region)).toContain('土耳其');
    expect(rows.every((row) => row.sourceUrl.length > 0)).toBe(true);
  });
});
