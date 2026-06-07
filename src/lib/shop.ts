export type ShopProduct = {
  platform: string;
  sourceUrl: string;
  name: string;
  price: number;
  stock: string;
  category: string;
  available: boolean;
  shopName?: string;
  sales?: number;
};

export type MarketplaceSource = {
  platform: string;
  sourceUrl: string;
  itemBaseUrl?: string;
};

type AnyRecord = Record<string, unknown>;

const AI_KEYWORDS = ['gpt', 'chatgpt', 'claude', 'plus', 'team', '成品', '代充', 'token', 'sub2api', 'cpa', '额度', 'ai'];

export function classifyProduct(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('代充') || normalized.includes('充值') || normalized.includes('直充')) return 'plus代充';
  if (normalized.includes('team')) return 'team号';
  if (normalized.includes('token') || normalized.includes('sub2api') || normalized.includes('cpa')) return 'token';
  if (normalized.includes('额度')) return '额度';
  if (normalized.includes('plus') || normalized.includes('成品')) return 'plus成品号';
  return '其他';
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of ['list', 'rows', 'data', 'items', 'goods', 'result', 'records']) {
    const child = value[key];
    const found = findArray(child);
    if (found.length) return found;
  }

  return [];
}

function getString(row: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getNumber(row: AnyRecord, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function getShopName(row: AnyRecord): string | undefined {
  const direct = getString(row, ['shop_name', 'shopName', 'store_name', 'merchant_name']);
  if (direct) return direct;
  const shop = row.shop;
  if (isRecord(shop)) return getString(shop, ['name', 'title', 'shop_name']);
  return undefined;
}

function getStock(row: AnyRecord): string {
  const stock = getString(row, ['stock_text', 'stockText', 'stock', 'inventory', 'num', 'goods_stock']);
  return stock || '未知';
}

function isAvailable(row: AnyRecord, stock: string): boolean {
  const status = getString(row, ['status_text', 'statusText', 'status', 'state']);
  if (/缺货|售罄|下架|sold|empty/i.test(`${stock} ${status}`)) return false;
  const numericStock = Number.parseFloat(stock);
  if (Number.isFinite(numericStock)) return numericStock > 0;
  return true;
}

function getSourceUrl(row: AnyRecord, source: MarketplaceSource): string {
  const direct = getString(row, ['url', 'link', 'sourceUrl']);
  if (direct) return direct.startsWith('http') ? direct : new URL(direct, source.sourceUrl).toString();

  const key = getString(row, ['goods_key', 'goodsKey', 'key', 'id']);
  if (key && source.itemBaseUrl) return new URL(key, source.itemBaseUrl).toString();
  return source.sourceUrl;
}

export function filterAiProducts(products: ShopProduct[]): ShopProduct[] {
  return products.filter((product) => AI_KEYWORDS.some((keyword) => product.name.toLowerCase().includes(keyword)));
}

export function normalizeMarketplaceProducts(payload: unknown, source: MarketplaceSource): ShopProduct[] {
  return findArray(payload)
    .filter(isRecord)
    .map((row) => {
      const name = getString(row, ['name', 'title', 'goods_name', 'goodsName', 'product_name']);
      const stock = getStock(row);
      return {
        platform: source.platform,
        sourceUrl: getSourceUrl(row, source),
        name,
        price: getNumber(row, ['price', 'money', 'amount', 'sale_price', 'goods_price']),
        stock,
        category: classifyProduct(name),
        available: isAvailable(row, stock),
        shopName: getShopName(row),
        sales: getNumber(row, ['sales', 'sale_count', 'sold', 'buy_count'])
      };
    })
    .filter((product) => product.name && product.price > 0)
    .filter((product) => AI_KEYWORDS.some((keyword) => product.name.toLowerCase().includes(keyword)))
    .sort((a, b) => a.price - b.price);
}
