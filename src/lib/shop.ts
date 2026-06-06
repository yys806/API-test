export type ShopProduct = {
  platform: string;
  sourceUrl: string;
  name: string;
  price: number;
  stock: string;
  category: string;
  available: boolean;
};

const STOCK_WORDS = ['库存充足', '库存少量', '库存一般', '缺货', '已售罄'];

export function classifyProduct(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('team')) return 'team号';
  if (normalized.includes('plus') || normalized.includes('成品')) return 'plus成品号';
  if (normalized.includes('代充') || normalized.includes('充值')) return 'plus代充';
  if (normalized.includes('token') || normalized.includes('sub2api') || normalized.includes('cpa')) return 'token';
  if (normalized.includes('额度')) return '额度';
  return '其他';
}

export function parseShopProducts(text: string, platform: string, sourceUrl: string): ShopProduct[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const products: ShopProduct[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== '￥') continue;
    const name = lines[index - 1];
    const price = Number.parseFloat(lines[index + 1]);
    const stock = lines[index + 2];

    if (!name || Number.isNaN(price) || !STOCK_WORDS.includes(stock)) continue;

    products.push({
      platform,
      sourceUrl,
      name,
      price,
      stock,
      category: classifyProduct(name),
      available: !['缺货', '已售罄'].includes(stock)
    });
  }

  return products;
}

export function filterAiProducts(products: ShopProduct[]): ShopProduct[] {
  const keywords = ['gpt', 'chatgpt', 'plus', 'team', '成品', '代充', 'token', 'sub2api', 'cpa', '额度', 'ai'];
  return products.filter((product) => keywords.some((keyword) => product.name.toLowerCase().includes(keyword)));
}
