import { describe, expect, it } from 'vitest';
import { buildPricingPayload, extractRegionalPricing, rankRegionalPrices } from './pricing';

const sampleHtml = `
  <script>
    let regionalData = {
      "chatgpt-plus-month": {
        "product": "chatgpt",
        "productName": "ChatGPT",
        "name": "ChatGPT Plus (月度)",
        "period": "月付",
        "updatedAt": "2026-06-03 18:29:44",
        "source": "https://viewappprice.com/zh/apps/chatgpt?sub=558",
        "sourceLabel": "ViewAppPrice",
        "prices": [
          { "country": "美国", "flag": "🇺🇸", "localPrice": "USD 20", "currency": "USD", "cny": 140, "usd": 20 },
          { "country": "土耳其", "flag": "🇹🇷", "localPrice": "TRY 499.99", "currency": "TRY", "cny": 76.11, "usd": 11.13 }
        ]
      },
      "claude-pro-month": {
        "product": "claude",
        "productName": "Claude",
        "name": "Claude Pro (月度)",
        "period": "月付",
        "updatedAt": "2026-06-02 12:00:00",
        "source": "https://viewappprice.com/zh/apps/claude",
        "sourceLabel": "ViewAppPrice",
        "prices": [
          { "country": "尼日利亚", "flag": "🇳🇬", "localPrice": "NGN 14900", "currency": "NGN", "cny": 75.55, "usd": 11.05 },
          { "country": "美国", "flag": "🇺🇸", "localPrice": "USD 20", "currency": "USD", "cny": 140, "usd": 20 }
        ]
      }
    };
  </script>
`;

describe('regional pricing', () => {
  it('extracts product plans from the referenced regional price page', () => {
    const products = extractRegionalPricing(sampleHtml);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      id: 'chatgpt-plus-month',
      productName: 'ChatGPT',
      name: 'ChatGPT Plus (月度)'
    });
    expect(products[1].prices[0].country).toBe('尼日利亚');
  });

  it('recalculates CNY with live exchange rates and sorts low to high', () => {
    const [plan] = extractRegionalPricing(sampleHtml);
    const ranked = rankRegionalPrices(plan, {
      base: 'USD',
      rates: {
        CNY: 7.2,
        USD: 1,
        TRY: 40
      },
      updatedAt: '2026-06-07T04:00:00.000Z'
    });

    expect(ranked.map((row) => row.country)).toEqual(['土耳其', '美国']);
    expect(ranked[0]).toMatchObject({
      cny: 80.14,
      exchangeSource: 'live-usd'
    });
    expect(ranked[1].cny).toBe(144);
  });

  it('builds ranked regions for every plan so UI plan switching is local', () => {
    const products = extractRegionalPricing(sampleHtml);
    const payload = buildPricingPayload(products, undefined, 'claude-pro-month');

    expect(payload.selectedPlanId).toBe('claude-pro-month');
    expect(payload.regions.map((row) => row.country)).toEqual(['尼日利亚', '美国']);
    expect(payload.rankingsByPlan['chatgpt-plus-month'].map((row) => row.country)).toEqual(['土耳其', '美国']);
    expect(payload.rankingsByPlan['claude-pro-month'].map((row) => row.country)).toEqual(['尼日利亚', '美国']);
  });
});
