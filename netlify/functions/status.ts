import type { Handler } from '@netlify/functions';
import { normalizeStatusSummary } from '../../src/lib/status';

const STATUS_SOURCES = [
  ['OpenAI', 'https://status.openai.com', 'https://status.openai.com/api/v2/summary.json'],
  ['Claude', 'https://status.claude.com', 'https://status.claude.com/api/v2/summary.json']
] as const;

export const handler: Handler = async () => {
  const results = await Promise.allSettled(
    STATUS_SOURCES.map(async ([provider, sourceUrl, apiUrl]) => {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`${provider} status fetch failed: ${response.status}`);
      return normalizeStatusSummary(provider, sourceUrl, await response.json());
    })
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: results.some((result) => result.status === 'fulfilled'),
      updatedAt: new Date().toISOString(),
      providers: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
      errors: results.flatMap((result) => (result.status === 'rejected' ? [String(result.reason)] : []))
    })
  };
};
