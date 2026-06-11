export type RegionalPriceInput = {
  country: string;
  flag?: string;
  localPrice: string;
  currency: string;
  cny?: number;
  usd?: number;
  displayPrice?: string;
};

export type RegionalProduct = {
  id: string;
  product: string;
  productName: string;
  name: string;
  period: string;
  updatedAt: string;
  source: string;
  sourceLabel: string;
  prices: RegionalPriceInput[];
};

export type ExchangeRates = {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
};

export type RankedRegionalPrice = {
  country: string;
  flag?: string;
  currency: string;
  localPrice: string;
  usd?: number;
  cny: number;
  displayPrice: string;
  exchangeSource: 'live-usd' | 'live-local' | 'fallback-page';
};

export const REGIONAL_PRICE_SOURCE = 'https://www.jingxialai.com/chatgptprice';

export const OFFICIAL_PRICING_SOURCES = [
  {
    provider: 'OpenAI',
    title: 'OpenAI API Pricing',
    url: 'https://openai.com/api/pricing/'
  },
  {
    provider: 'Claude',
    title: 'Claude API Pricing',
    url: 'https://docs.claude.com/en/docs/about-claude/pricing'
  },
  {
    provider: 'ChatGPT / Claude 地区订阅',
    title: 'Regional subscription ranking reference',
    url: REGIONAL_PRICE_SOURCE
  }
];

type RawRegionalProduct = Omit<RegionalProduct, 'id'>;

function readBalancedObject(source: string, start: number): string {
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  throw new Error('regionalData object is incomplete');
}

function normalizeRegionalProducts(parsed: Record<string, RawRegionalProduct>): RegionalProduct[] {
  return Object.entries(parsed).map(([id, value]) => ({
    id,
    product: value.product,
    productName: value.productName,
    name: value.name,
    period: value.period,
    updatedAt: value.updatedAt,
    source: value.source,
    sourceLabel: value.sourceLabel,
    prices: Array.isArray(value.prices) ? value.prices : []
  }));
}

function extractLegacyRegionalData(html: string): RegionalProduct[] {
  const marker = 'regionalData';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return [];

  const objectStart = html.indexOf('{', markerIndex);
  if (objectStart < 0) return [];

  const rawJson = readBalancedObject(html, objectStart);
  const parsed = JSON.parse(rawJson) as Record<string, RawRegionalProduct>;

  return normalizeRegionalProducts(parsed);
}

function extractGlobalPricingData(html: string): RegionalProduct[] {
  const marker = 'window.LJAI_GLOBAL_PRICING';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return [];

  const dataMatch = /(?:^|[,{]\s*)data\s*:/g;
  dataMatch.lastIndex = markerIndex;
  const match = dataMatch.exec(html);
  if (!match) return [];

  const objectStart = html.indexOf('{', dataMatch.lastIndex);
  if (objectStart < 0) return [];

  const rawJson = readBalancedObject(html, objectStart);
  const parsed = JSON.parse(rawJson) as Record<string, RawRegionalProduct>;

  return normalizeRegionalProducts(parsed);
}

export function extractRegionalPricing(html: string): RegionalProduct[] {
  const globalPricing = extractGlobalPricingData(html);
  return globalPricing.length ? globalPricing : extractLegacyRegionalData(html);
}

function parseLocalAmount(localPrice: string): number | null {
  const normalized = localPrice.replace(/,/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function convertToCny(row: RegionalPriceInput, exchange?: ExchangeRates): Pick<RankedRegionalPrice, 'cny' | 'exchangeSource'> {
  const cnyRate = exchange?.rates.CNY;
  if (exchange && cnyRate && typeof row.usd === 'number') {
    return { cny: roundMoney(row.usd * cnyRate), exchangeSource: 'live-usd' };
  }

  if (typeof row.cny === 'number' && row.cny > 0) {
    return { cny: roundMoney(row.cny), exchangeSource: 'fallback-page' };
  }

  const localRate = row.currency ? exchange?.rates[row.currency] : undefined;
  const localAmount = parseLocalAmount(row.localPrice);
  if (exchange && cnyRate && localRate && localAmount !== null) {
    return { cny: roundMoney((localAmount / localRate) * cnyRate), exchangeSource: 'live-local' };
  }

  return { cny: roundMoney(row.cny ?? 0), exchangeSource: 'fallback-page' };
}

export function rankRegionalPrices(plan: RegionalProduct, exchange?: ExchangeRates): RankedRegionalPrice[] {
  return plan.prices
    .map((row) => {
      const converted = convertToCny(row, exchange);
      return {
        country: row.country,
        flag: row.flag,
        currency: row.currency,
        localPrice: row.localPrice,
        usd: row.usd,
        cny: converted.cny,
        displayPrice: `¥${converted.cny.toFixed(2)}`,
        exchangeSource: converted.exchangeSource
      };
    })
    .filter((row) => row.cny > 0)
    .sort((a, b) => a.cny - b.cny);
}

export function buildPricingPayload(products: RegionalProduct[], exchange?: ExchangeRates, selectedPlanId?: string) {
  const selectedPlan = products.find((plan) => plan.id === selectedPlanId) ?? products[0] ?? null;
  const rankingsByPlan = Object.fromEntries(products.map((plan) => [plan.id, rankRegionalPrices(plan, exchange)]));

  return {
    sourceUrl: REGIONAL_PRICE_SOURCE,
    exchange,
    plans: products.map((plan) => ({
      id: plan.id,
      product: plan.product,
      productName: plan.productName,
      name: plan.name,
      period: plan.period,
      updatedAt: plan.updatedAt,
      source: plan.source,
      sourceLabel: plan.sourceLabel,
      count: plan.prices.length
    })),
    selectedPlanId: selectedPlan?.id ?? null,
    regions: selectedPlan ? rankingsByPlan[selectedPlan.id] : [],
    rankingsByPlan
  };
}
