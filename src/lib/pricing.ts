export type RegionalPrice = {
  region: string;
  currency: string;
  localMonthly: number;
  cnyMonthly: number;
  product: string;
  sourceUrl: string;
};

const SOURCE_URL = 'https://www.jingxialai.com/chatgptprice';

const REGIONAL_PRICES: RegionalPrice[] = [
  { region: '印度', currency: 'INR', localMonthly: 1999, cnyMonthly: 166, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '土耳其', currency: 'TRY', localMonthly: 499.99, cnyMonthly: 104, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '尼日利亚', currency: 'NGN', localMonthly: 29000, cnyMonthly: 135, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '菲律宾', currency: 'PHP', localMonthly: 1100, cnyMonthly: 139, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '美国', currency: 'USD', localMonthly: 20, cnyMonthly: 143, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '中国香港', currency: 'HKD', localMonthly: 158, cnyMonthly: 145, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '日本', currency: 'JPY', localMonthly: 3000, cnyMonthly: 149, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL },
  { region: '欧元区', currency: 'EUR', localMonthly: 22.99, cnyMonthly: 189, product: 'ChatGPT Plus', sourceUrl: SOURCE_URL }
];

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
    provider: 'ChatGPT',
    title: 'Regional subscription price reference',
    url: SOURCE_URL
  }
];

export function getRegionalPriceRanking(): RegionalPrice[] {
  return [...REGIONAL_PRICES].sort((a, b) => a.cnyMonthly - b.cnyMonthly);
}
