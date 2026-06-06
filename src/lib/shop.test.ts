import { describe, expect, it } from 'vitest';
import { parseShopProducts } from './shop';

describe('parseShopProducts', () => {
  it('extracts product name, price, stock and keyword category from shop text', () => {
    const text = `
      选择商品
      ChatGPT Team 子号Token（单号·实时验活｜含RT｜CPA+sub2api）
      ￥
      1.3
      库存充足
      PLUS成品(保首登)pp新方法
      ￥
      4
      缺货
    `;

    const products = parseShopProducts(text, '链动小铺', 'https://pay.ldxp.cn/shop/S5I572HE');

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      platform: '链动小铺',
      name: 'ChatGPT Team 子号Token（单号·实时验活｜含RT｜CPA+sub2api）',
      price: 1.3,
      stock: '库存充足',
      category: 'team号'
    });
    expect(products[1].category).toBe('plus成品号');
  });
});
