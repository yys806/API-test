import { describe, expect, it } from 'vitest';
import { buildDownloadFileName, convertSessionInput, EXAMPLE_SESSION } from './sessionConverter';

describe('convertSessionInput', () => {
  it('converts AT-only JSON into sub2api account entries', () => {
    const result = convertSessionInput(
      JSON.stringify({
        type: 'codex',
        access_token: 'access-token',
        refresh_token: 'refresh-token'
      }),
      'sub2api'
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.skipped).toBe(0);
    expect(JSON.parse(result.output)).toMatchObject({
      proxies: [],
      accounts: [
        {
          platform: 'openai',
          type: 'oauth',
          credentials: {
            access_token: 'access-token'
          }
        }
      ]
    });
  });

  it('converts full ChatGPT session JSON into CPA-style output', () => {
    const result = convertSessionInput(
      JSON.stringify({
        user: { email: 'mark@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }),
      'cpa'
    );

    expect(result.accounts[0].email).toBe('mark@example.com');
    expect(JSON.parse(result.output)).toMatchObject({
      email: 'mark@example.com',
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    });
  });

  it('finds nested session objects and reports skipped records', () => {
    const result = convertSessionInput(
      JSON.stringify({
        exports: [
          {
            user: { email: 'nested@example.com' },
            account: { id: 'acct-1', planType: 'plus' },
            accessToken: 'nested-access',
            refreshToken: 'nested-refresh'
          },
          { label: 'broken', accessToken: '' }
        ]
      }),
      'sub2api'
    );

    const output = JSON.parse(result.output);
    expect(result.accounts).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
    expect(output.accounts[0]).toMatchObject({
      platform: 'openai',
      type: 'oauth',
      credentials: {
        access_token: 'nested-access',
        chatgpt_account_id: 'acct-1',
        email: 'nested@example.com',
        plan_type: 'plus'
      }
    });
  });

  it('returns Codex-Manager output and a safe download filename', () => {
    const result = convertSessionInput(JSON.stringify(EXAMPLE_SESSION), 'codex-manager', new Date('2026-06-07T05:04:03.000Z'));
    const output = JSON.parse(result.output);

    expect(output).toMatchObject({
      tokens: {
        access_token: EXAMPLE_SESSION.accessToken,
        account_id: EXAMPLE_SESSION.account.id
      },
      meta: {
        label: EXAMPLE_SESSION.user.email
      }
    });
    expect(buildDownloadFileName(result.accounts, 'codex-manager', new Date('2026-06-07T05:04:03.000Z'))).toBe(
      'mark@example.codex-manager.2026-06-07_13-04-03.json'
    );
  });

  it('shows an issue when no convertible session is found', () => {
    const result = convertSessionInput(JSON.stringify({ hello: 'world' }), 'axonhub');

    expect(result.accounts).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(result.issues[0].reason).toContain('accessToken');
    expect(result.output).toBe('');
  });
});
