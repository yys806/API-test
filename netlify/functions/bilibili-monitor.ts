import type { Handler } from '@netlify/functions';

const SEARCH_URL = 'https://search.bilibili.com/all?keyword=ChatGPT%20Plus%20%E4%BD%8E%E4%BB%B7';

export const handler: Handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ok: true,
    updatedAt: new Date().toISOString(),
    sourceUrl: SEARCH_URL,
    rule: '最近5天、播放量破万、低价GPT/Claude相关内容；直播抓取不稳定时保留人工复核入口。',
    items: [
      {
        title: '低价 GPT / Plus 渠道监测',
        url: SEARCH_URL,
        views: 0,
        publishedAt: null,
        summary: '当前版本提供监测入口和筛选规则。接入稳定 B 站数据源后会自动显示近5天破万播放视频，并摘要其公开方法。'
      }
    ]
  })
});
