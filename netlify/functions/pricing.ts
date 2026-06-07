import type { Handler } from '@netlify/functions';
import {
  buildPricingPayload,
  extractRegionalPricing,
  OFFICIAL_PRICING_SOURCES,
  REGIONAL_PRICE_SOURCE,
  type ExchangeRates
} from '../../src/lib/pricing';

const EXCHANGE_URL = 'https://open.er-api.com/v6/latest/USD';

async function fetchExchangeRates(): Promise<ExchangeRates | undefined> {
  const response = await fetch(EXCHANGE_URL, {
    headers: { 'User-Agent': 'Shen AI pricing monitor' }
  });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
  if (!payload.rates?.CNY) return undefined;
  return {
    base: 'USD',
    rates: payload.rates,
    updatedAt: payload.time_last_update_utc ? new Date(payload.time_last_update_utc).toISOString() : new Date().toISOString()
  };
}

export const handler: Handler = async () => {
  const errors: string[] = [];

  try {
    const [pageResult, exchangeResult] = await Promise.allSettled([
      fetch(REGIONAL_PRICE_SOURCE, {
        headers: { 'User-Agent': 'Mozilla/5.0 Shen AI pricing monitor' }
      }),
      fetchExchangeRates()
    ]);

    if (pageResult.status === 'rejected' || !pageResult.value.ok) {
      const reason = pageResult.status === 'rejected' ? pageResult.reason : `HTTP ${pageResult.value.status}`;
      throw new Error(`价格页抓取失败：${String(reason)}`);
    }

    if (exchangeResult.status === 'rejected') {
      errors.push(`实时汇率获取失败，使用页面折算价：${String(exchangeResult.reason)}`);
    }

    const html = await pageResult.value.text();
    const products = extractRegionalPricing(html);
    if (!products.length) throw new Error('价格页中未找到 regionalData');

    const payload = buildPricingPayload(products, exchangeResult.status === 'fulfilled' ? exchangeResult.value : undefined);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
        sources: OFFICIAL_PRICING_SOURCES,
        errors,
        ...payload
      })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        ok: false,
        updatedAt: new Date().toISOString(),
        sources: OFFICIAL_PRICING_SOURCES,
        errors: [error instanceof Error ? error.message : String(error)],
        plans: [],
        selectedPlanId: null,
        regions: []
      })
    };
  }
};
