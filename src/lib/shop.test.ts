import { describe, expect, it } from 'vitest';
import { classifyProduct, normalizeMarketplaceProducts } from './shop';

describe('shop products', () => {
  it('normalizes public marketplace product API rows into sorted AI product cards', () => {
    const rows = normalizeMarketplaceProducts(
      {
        data: {
          list: [
            {
              id: 1001,
              name: 'ChatGPT Plus 成品号 保首登',
              price: '4.50',
              stock: 12,
              sales: 88,
              shop_name: '低价小铺',
              goods_key: 'abc'
            },
            {
              id: 1002,
              name: '普通影视会员',
              price: '1.00',
              stock: 30
            },
            {
              id: 1003,
              title: 'Claude Team 共享号',
              money: 9.9,
              inventory: 0,
              shop: { name: '云猫店铺' },
              url: 'https://catfk.com/item/team'
            }
          ]
        }
      },
      {
        platform: '链动小铺',
        sourceUrl: 'https://pay.ldxp.cn',
        itemBaseUrl: 'https://pay.ldxp.cn/item/'
      }
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.name)).toEqual(['ChatGPT Plus 成品号 保首登', 'Claude Team 共享号']);
    expect(rows[0]).toMatchObject({
      platform: '链动小铺',
      shopName: '低价小铺',
      price: 4.5,
      stock: '12',
      available: true,
      category: 'plus成品号',
      sourceUrl: 'https://pay.ldxp.cn/item/abc'
    });
    expect(rows[1].available).toBe(false);
  });

  it('classifies recharge, team, token and quota products', () => {
    expect(classifyProduct('ChatGPT Plus 代充')).toBe('plus代充');
    expect(classifyProduct('Claude Team 子号')).toBe('team号');
    expect(classifyProduct('CPA sub2api token')).toBe('token');
    expect(classifyProduct('GPT 额度')).toBe('额度');
  });
});
