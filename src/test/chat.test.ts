import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';
import { handler } from '../../netlify/functions/chat';

function makeEvent(overrides: Partial<HandlerEvent>): HandlerEvent {
  return {
    httpMethod: 'POST',
    headers: {},
    body: null,
    ...overrides
  } as HandlerEvent;
}

const context = {} as never;

describe('chat function origin guard', () => {
  beforeEach(() => {
    vi.stubEnv('URL', 'https://example.netlify.app');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects non-POST requests with 405', async () => {
    const response = await handler(makeEvent({ httpMethod: 'GET' }), context);
    expect(response?.statusCode).toBe(405);
  });

  it('rejects requests from a foreign origin with 403', async () => {
    const response = await handler(
      makeEvent({ headers: { origin: 'https://evil.example.com' }, body: '{}' }),
      context
    );
    expect(response?.statusCode).toBe(403);
    expect(JSON.parse(response?.body ?? '{}')).toMatchObject({ ok: false, status: 403 });
  });

  it('rejects requests without origin and referer with 403', async () => {
    const response = await handler(makeEvent({ headers: {}, body: '{}' }), context);
    expect(response?.statusCode).toBe(403);
  });

  it('lets same-origin requests pass the guard and hit input validation', async () => {
    const response = await handler(
      makeEvent({ headers: { origin: 'https://example.netlify.app' }, body: '{}' }),
      context
    );
    // 空请求体不会触发上游请求,而是命中参数校验的 400,说明来源校验已放行。
    expect(response?.statusCode).toBe(400);
    expect(JSON.parse(response?.body ?? '{}')).toMatchObject({ ok: false, error: 'Base URL is required.' });
  });

  it('lets localhost development requests pass the guard', async () => {
    const response = await handler(
      makeEvent({ headers: { origin: 'http://localhost:8899' }, body: '{}' }),
      context
    );
    expect(response?.statusCode).toBe(400);
  });
});
