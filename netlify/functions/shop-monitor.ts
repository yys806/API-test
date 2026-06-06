import type { Handler } from '@netlify/functions';
import { filterAiProducts, parseShopProducts } from '../../src/lib/shop';

const SHOP_SOURCES = [
  {
    platform: '链动小铺',
    url: 'https://pay.ldxp.cn/shop/S5I572HE'
  },
  {
    platform: '云猫寄售',
    url: 'https://catfk.com/shop/I8IXPSSZ'
  }
];

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&yen;/g, '￥')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n');
}

export const handler: Handler = async () => {
  const results = await Promise.allSettled(
    SHOP_SOURCES.map(async (source) => {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 AI resource dashboard monitor'
        }
      });
      if (!response.ok) throw new Error(`${source.platform} fetch failed: ${response.status}`);
      const html = await response.text();
      return {
        ...source,
        products: filterAiProducts(parseShopProducts(htmlToText(html), source.platform, source.url))
      };
    })
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: results.some((result) => result.status === 'fulfilled'),
      updatedAt: new Date().toISOString(),
      shops: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
      errors: results.flatMap((result) => (result.status === 'rejected' ? [String(result.reason)] : []))
    })
  };
};
