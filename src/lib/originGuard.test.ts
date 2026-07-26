import { describe, expect, it } from 'vitest';
import { buildAllowedOrigins, isTrustedRequestOrigin } from './originGuard';

const env = {
  URL: 'https://example.netlify.app',
  DEPLOY_PRIME_URL: 'https://deploy-preview-12--example.netlify.app',
  DEPLOY_URL: 'https://654321--example.netlify.app'
};

describe('buildAllowedOrigins', () => {
  it('collects origins from Netlify URL environment variables', () => {
    expect(buildAllowedOrigins(env)).toEqual([
      'https://example.netlify.app',
      'https://deploy-preview-12--example.netlify.app',
      'https://654321--example.netlify.app'
    ]);
  });

  it('skips unset or malformed values', () => {
    expect(buildAllowedOrigins({})).toEqual([]);
    expect(buildAllowedOrigins({ URL: 'not-a-url' })).toEqual([]);
  });
});

describe('isTrustedRequestOrigin', () => {
  it('accepts the production site origin', () => {
    expect(isTrustedRequestOrigin({ origin: 'https://example.netlify.app' }, env)).toBe(true);
  });

  it('accepts deploy preview and deploy origins', () => {
    expect(isTrustedRequestOrigin({ origin: 'https://deploy-preview-12--example.netlify.app' }, env)).toBe(true);
    expect(isTrustedRequestOrigin({ origin: 'https://654321--example.netlify.app' }, env)).toBe(true);
  });

  it('accepts localhost and loopback on any port for local development', () => {
    expect(isTrustedRequestOrigin({ origin: 'http://localhost:8899' }, env)).toBe(true);
    expect(isTrustedRequestOrigin({ origin: 'http://127.0.0.1:5173' }, env)).toBe(true);
    expect(isTrustedRequestOrigin({ origin: 'http://[::1]:8899' }, env)).toBe(true);
    expect(isTrustedRequestOrigin({ origin: 'http://localhost:8899' }, {})).toBe(true);
  });

  it('falls back to the referer header when origin is missing', () => {
    expect(isTrustedRequestOrigin({ referer: 'https://example.netlify.app/some/page' }, env)).toBe(true);
    expect(isTrustedRequestOrigin({ referer: 'https://evil.example.com/page' }, env)).toBe(false);
  });

  it('matches header names case-insensitively', () => {
    expect(isTrustedRequestOrigin({ Origin: 'https://example.netlify.app' }, env)).toBe(true);
  });

  it('rejects foreign, malformed, null and missing origins', () => {
    expect(isTrustedRequestOrigin({ origin: 'https://evil.example.com' }, env)).toBe(false);
    expect(isTrustedRequestOrigin({ origin: 'https://example.netlify.app.evil.com' }, env)).toBe(false);
    expect(isTrustedRequestOrigin({ origin: 'null' }, env)).toBe(false);
    expect(isTrustedRequestOrigin({ origin: 'not-a-url' }, env)).toBe(false);
    expect(isTrustedRequestOrigin({}, env)).toBe(false);
  });

  it('only allows http/https localhost, not a lookalike domain', () => {
    expect(isTrustedRequestOrigin({ origin: 'https://localhost.evil.com' }, env)).toBe(false);
  });
});
