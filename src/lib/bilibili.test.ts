import { describe, expect, it } from 'vitest';
import { normalizeBilibiliHtml, normalizeBilibiliSearch, summarizeBilibiliMethod } from './bilibili';

describe('bilibili monitor', () => {
  it('keeps only recent low-price AI videos over ten thousand views', () => {
    const now = new Date('2026-06-07T12:00:00+08:00');
    const rows = normalizeBilibiliSearch(
      {
        data: {
          result: [
            {
              title: 'ChatGPT Plus 低价成品号方法分享',
              bvid: 'BV123',
              play: '1.2万',
              pubdate: Math.floor(new Date('2026-06-05T10:00:00+08:00').getTime() / 1000),
              author: 'up1',
              description: '通过成品号和代充渠道对比价格，提醒先小额测试。'
            },
            {
              title: 'Claude 低价 Team 号',
              arcurl: 'https://www.bilibili.com/video/BV456',
              play: 9800,
              pubdate: Math.floor(new Date('2026-06-06T10:00:00+08:00').getTime() / 1000)
            },
            {
              title: 'ChatGPT Plus 低价',
              bvid: 'BV789',
              play: 30000,
              pubdate: Math.floor(new Date('2026-05-30T10:00:00+08:00').getTime() / 1000)
            }
          ]
        }
      },
      now
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'ChatGPT Plus 低价成品号方法分享',
      url: 'https://www.bilibili.com/video/BV123',
      views: 12000,
      author: 'up1'
    });
    expect(rows[0].summary).toContain('成品号');
  });

  it('summarizes the public method from title and description', () => {
    expect(summarizeBilibiliMethod('GPT Plus 代充低价教程', '先看库存，再用小额订单验证')).toBe(
      '关键词：Plus / 代充；做法：先看库存，再用小额订单验证'
    );
  });

  it('extracts rendered search result cards from Bilibili html fallback', () => {
    const now = new Date('2026-06-07T12:00:00+08:00');
    const html = `
      <a href="//www.bilibili.com/video/BV14e7X6rEEM/" target="_blank">
        <img alt="Chatgpt无卡pp白嫖plus最新教程" />
        <div class="bili-video-card__stats"><span>1.5万</span><span>3</span></div>
        <h3 title="Chatgpt无卡pp白嫖plus最新教程"></h3>
        <span class="bili-video-card__info--author">ChatGPT5官方</span>
        <span class="bili-video-card__info--date"> · 06-03</span>
      </a>
    `;

    const rows = normalizeBilibiliHtml(html, now);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Chatgpt无卡pp白嫖plus最新教程',
      url: 'https://www.bilibili.com/video/BV14e7X6rEEM',
      views: 15000,
      author: 'ChatGPT5官方'
    });
  });
});
