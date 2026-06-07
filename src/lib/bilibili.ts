export type BilibiliVideo = {
  title: string;
  url: string;
  views: number;
  publishedAt: string;
  author?: string;
  summary: string;
};

type AnyRecord = Record<string, unknown>;

const AI_KEYWORDS = ['gpt', 'chatgpt', 'claude', 'plus', 'team'];
const DEAL_KEYWORDS = ['低价', '成品号', '成品', '代充', '共享号', '充值', '订阅', '白嫖', 'plus'];
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function parseViewCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/[\d.]+/);
  if (!match) return 0;
  const amount = Number.parseFloat(match[0]);
  if (!Number.isFinite(amount)) return 0;
  if (trimmed.includes('万')) return Math.round(amount * 10000);
  if (trimmed.includes('k')) return Math.round(amount * 1000);
  return Math.round(amount);
}

function parseHtmlAttr(fragment: string, attr: string): string {
  const pattern = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
  return stripHtml(fragment.match(pattern)?.[1] ?? '');
}

function parseCardDate(value: string, now: Date): Date | null {
  const match = value.match(/(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const date = new Date(now);
  date.setMonth(month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    date.setFullYear(date.getFullYear() - 1);
  }
  return date;
}

function toPublishedDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const hasAi = AI_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  const hasDeal = DEAL_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  return hasAi && hasDeal;
}

export function summarizeBilibiliMethod(title: string, description = ''): string {
  const text = `${title} ${description}`;
  const tags = [
    text.includes('Plus') || text.includes('plus') ? 'Plus' : '',
    /Team|team/.test(text) ? 'Team' : '',
    text.includes('成品') ? '成品号' : '',
    text.includes('代充') ? '代充' : '',
    /token|sub2api|CPA/i.test(text) ? 'Token' : ''
  ].filter(Boolean);
  const cleaned = stripHtml(description).replace(/\s+/g, ' ').slice(0, 72);
  return `关键词：${tags.length ? tags.join(' / ') : '低价渠道'}；做法：${cleaned || '打开视频查看 UP 主公开说明，优先核对库存、价格和售后规则'}`;
}

function readResults(payload: unknown): unknown[] {
  if (!isRecord(payload)) return [];
  const data = payload.data;
  if (!isRecord(data)) return [];
  const result = data.result;
  return Array.isArray(result) ? result : [];
}

export function normalizeBilibiliSearch(payload: unknown, now = new Date()): BilibiliVideo[] {
  const cutoff = now.getTime() - FIVE_DAYS_MS;

  return readResults(payload)
    .filter(isRecord)
    .map((row) => {
      const title = stripHtml(String(row.title ?? ''));
      const description = stripHtml(String(row.description ?? row.desc ?? ''));
      const published = toPublishedDate(row.pubdate ?? row.created ?? row.created_at);
      const bvid = typeof row.bvid === 'string' ? row.bvid : '';
      const url = typeof row.arcurl === 'string' && row.arcurl ? row.arcurl : bvid ? `https://www.bilibili.com/video/${bvid}` : '';
      return {
        title,
        url,
        views: parseViewCount(row.play ?? row.view ?? row.stat_view),
        publishedAt: published?.toISOString() ?? '',
        author: typeof row.author === 'string' ? row.author : undefined,
        summary: summarizeBilibiliMethod(title, description),
        relevantText: `${title} ${description}`
      };
    })
    .filter((row) => row.title && row.url && row.publishedAt)
    .filter((row) => new Date(row.publishedAt).getTime() >= cutoff)
    .filter((row) => row.views >= 10000)
    .filter((row) => isRelevant(row.title, row.relevantText))
    .map(({ relevantText, ...row }) => row)
    .sort((a, b) => b.views - a.views);
}

export function normalizeBilibiliHtml(html: string, now = new Date()): BilibiliVideo[] {
  const cutoff = now.getTime() - FIVE_DAYS_MS;
  const matches = [...html.matchAll(/href=["']\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)/g)];

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? html.length;
      const card = html.slice(start, end);
      const bvid = match[1] ?? '';
      const title = parseHtmlAttr(card, 'alt') || parseHtmlAttr(card, 'title');
      const statMatch = card.match(/bili-video-card__stats[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
      const views = parseViewCount(statMatch?.[1] ?? '');
      const authorMatch = card.match(/bili-video-card__info--author[^>]*>([^<]+)<\/span>/);
      const dateMatch = card.match(/bili-video-card__info--date[^>]*>([^<]+)<\/span>/);
      const published = parseCardDate(stripHtml(dateMatch?.[1] ?? ''), now);
      return {
        title,
        url: bvid ? `https://www.bilibili.com/video/${bvid}` : '',
        views,
        publishedAt: published?.toISOString() ?? '',
        author: stripHtml(authorMatch?.[1] ?? '') || undefined,
        summary: summarizeBilibiliMethod(title, title),
        relevantText: title
      };
    })
    .filter((row) => row.title && row.url && row.publishedAt)
    .filter((row) => new Date(row.publishedAt).getTime() >= cutoff)
    .filter((row) => row.views >= 10000)
    .filter((row) => isRelevant(row.title, row.relevantText))
    .map(({ relevantText, ...row }) => row)
    .sort((a, b) => b.views - a.views);
}
