import type { Handler } from '@netlify/functions';
import https from 'node:https';
import { normalizeBilibiliHtml, normalizeBilibiliSearch, type BilibiliVideo } from '../../src/lib/bilibili';

const SEARCH_JOBS = [
  { keyword: 'ChatGPT 低价', order: 'totalrank', pages: [1, 2] },
  { keyword: 'ChatGPT Plus 低价', order: 'totalrank', pages: [1] },
  { keyword: 'Claude Pro 低价', order: 'totalrank', pages: [1] },
  { keyword: 'GPT Plus 充值', order: 'totalrank', pages: [1] },
  { keyword: 'ChatGPT 低价', order: 'pubdate', pages: [1] }
];

function searchUrl(keyword: string, order: string, page: number): string {
  const params = new URLSearchParams({
    search_type: 'video',
    keyword,
    order,
    page: String(page)
  });
  return `https://api.bilibili.com/x/web-interface/search/type?${params.toString()}`;
}

function htmlSearchUrl(keyword: string, order: string, page: number): string {
  const params = new URLSearchParams({
    keyword,
    order,
    page: String(page)
  });
  return `https://search.bilibili.com/all?${params.toString()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchSearch(keyword: string, order: string, page: number): Promise<BilibiliVideo[]> {
  const url = new URL(searchUrl(keyword, order, page));
  const payload = await new Promise<unknown>((resolve, reject) => {
    const request = https.get(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
          Referer: 'https://search.bilibili.com/',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${keyword}/${order}/p${page}: HTTP ${response.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.setTimeout(7000, () => {
      request.destroy(new Error(`${keyword}/${order}/p${page}: timeout`));
    });
    request.on('error', reject);
  });

  return normalizeBilibiliSearch(payload, new Date());
}

async function fetchSearchHtml(keyword: string, order: string, page: number): Promise<BilibiliVideo[]> {
  const url = new URL(htmlSearchUrl(keyword, order, page));
  const html = await new Promise<string>((resolve, reject) => {
    const request = https.get(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
          Referer: 'https://search.bilibili.com/',
          Accept: 'text/html,*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${keyword}/${order}/p${page}/html: HTTP ${response.statusCode}`));
            return;
          }
          resolve(body);
        });
      }
    );
    request.setTimeout(7000, () => {
      request.destroy(new Error(`${keyword}/${order}/p${page}/html: timeout`));
    });
    request.on('error', reject);
  });

  return normalizeBilibiliHtml(html, new Date());
}

export const handler: Handler = async () => {
  const errors: string[] = [];
  const deduped = new Map<string, BilibiliVideo>();

  for (const job of SEARCH_JOBS) {
    for (const page of job.pages) {
      try {
        const rows = await fetchSearch(job.keyword, job.order, page);
        for (const item of rows) {
          deduped.set(item.url, item);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        try {
          const rows = await fetchSearchHtml(job.keyword, job.order, page);
          for (const item of rows) {
            deduped.set(item.url, item);
          }
        } catch (htmlError) {
          errors.push(htmlError instanceof Error ? htmlError.message : String(htmlError));
        }
      }
      await sleep(500);
    }
  }

  const items = [...deduped.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      ok: items.length > 0 || errors.length < SEARCH_JOBS.length,
      updatedAt: new Date().toISOString(),
      sourceUrl: 'https://search.bilibili.com/',
      rule: '自动搜索 GPT / Claude 低价、成品号、代充、Team 等关键词；仅保留近 5 天且播放量 >= 10000 的视频。',
      keywords: SEARCH_JOBS.map((job) => `${job.keyword}/${job.order}`),
      items,
      errors
    })
  };
};
