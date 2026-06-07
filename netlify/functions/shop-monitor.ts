import type { Handler } from '@netlify/functions';
import { normalizeMarketplaceProducts } from '../../src/lib/shop';

type CandidateEndpoint = {
  platform: string;
  baseUrl: string;
  itemBaseUrl: string;
  url: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
};

const KEYWORDS = ['ChatGPT', 'Claude', 'GPT Plus', 'Team', '成品号', '代充'];

const CANDIDATES: CandidateEndpoint[] = [
  ...KEYWORDS.flatMap((keyword) => [
    {
      platform: '链动小铺',
      baseUrl: 'https://pay.ldxp.cn',
      itemBaseUrl: 'https://pay.ldxp.cn/item/',
      url: 'https://pay.ldxp.cn/shopApi/Shop/goodsList',
      method: 'POST' as const,
      body: { keywords: keyword, current: 1, pageSize: 30, category_id: 0, goods_type: 'article' }
    },
    {
      platform: '链动小铺',
      baseUrl: 'https://pay.ldxp.cn',
      itemBaseUrl: 'https://pay.ldxp.cn/item/',
      url: 'https://pay.ldxp.cn/shopApi/goods/search',
      method: 'POST' as const,
      body: { keyword, page: 1, limit: 30 }
    },
    {
      platform: '链动小铺',
      baseUrl: 'https://pay.ldxp.cn',
      itemBaseUrl: 'https://pay.ldxp.cn/item/',
      url: 'https://pay.ldxp.cn/shopApi/search/goods',
      method: 'POST' as const,
      body: { keyword, page: 1, limit: 30 }
    },
    {
      platform: '云猫寄售',
      baseUrl: 'https://catfk.com',
      itemBaseUrl: 'https://catfk.com/item/',
      url: 'https://catfk.com/shopApi/Shop/goodsList',
      method: 'POST' as const,
      body: { keywords: keyword, current: 1, pageSize: 30, category_id: 0, goods_type: 'article' }
    },
    {
      platform: '云猫寄售',
      baseUrl: 'https://catfk.com',
      itemBaseUrl: 'https://catfk.com/item/',
      url: 'https://catfk.com/shopApi/goods/search',
      method: 'POST' as const,
      body: { keyword, page: 1, limit: 30 }
    },
    {
      platform: '云猫寄售',
      baseUrl: 'https://catfk.com',
      itemBaseUrl: 'https://catfk.com/item/',
      url: 'https://catfk.com/shopApi/search/goods',
      method: 'POST' as const,
      body: { keyword, page: 1, limit: 30 }
    }
  ])
];

async function requestCandidate(candidate: CandidateEndpoint) {
  const response = await fetch(candidate.url, {
    method: candidate.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 Shen AI shop monitor',
      Referer: `${candidate.baseUrl}/`,
      'Content-Type': 'application/json'
    },
    body: candidate.body ? JSON.stringify(candidate.body) : undefined
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`${candidate.platform} ${candidate.url} HTTP ${response.status}`);

  const payload = JSON.parse(text) as unknown;
  return normalizeMarketplaceProducts(payload, {
    platform: candidate.platform,
    sourceUrl: candidate.baseUrl,
    itemBaseUrl: candidate.itemBaseUrl
  });
}

export const handler: Handler = async () => {
  const results = await Promise.allSettled(CANDIDATES.map(requestCandidate));
  const productsByUrl = new Map<string, ReturnType<typeof normalizeMarketplaceProducts>[number]>();
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const product of result.value) {
        productsByUrl.set(`${product.platform}:${product.sourceUrl}:${product.name}`, product);
      }
    } else {
      errors.push(String(result.reason));
    }
  }

  const products = [...productsByUrl.values()].sort((a, b) => a.price - b.price).slice(0, 50);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      ok: products.length > 0,
      updatedAt: new Date().toISOString(),
      mode: products.length > 0 ? 'public-search' : 'needs-merchant-api',
      note:
        products.length > 0
          ? '已从公开货源搜索接口聚合商品。'
          : '两个平台的游客端暂未暴露可用的平台级货源搜索接口；如需直接搜索别的店铺和商品，需要提供商家中心登录态、开放 API 或后台接口文档。',
      keywords: KEYWORDS,
      products,
      errors: products.length > 0 ? errors.slice(0, 4) : []
    })
  };
};
