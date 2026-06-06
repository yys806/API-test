import type { Handler } from '@netlify/functions';
import { getRegionalPriceRanking, OFFICIAL_PRICING_SOURCES } from '../../src/lib/pricing';

export const handler: Handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ok: true,
    updatedAt: new Date().toISOString(),
    sources: OFFICIAL_PRICING_SOURCES,
    regions: getRegionalPriceRanking()
  })
});
