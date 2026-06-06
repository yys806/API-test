import { describe, expect, it } from 'vitest';
import { convertSessionInput } from './sessionConverter';

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
    expect(JSON.parse(result.output)).toEqual([
      {
        platform: 'openai',
        credentials: {
          type: 'codex',
          access_token: 'access-token',
          refresh_token: 'refresh-token'
        }
      }
    ]);
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
      accounts: [
        {
          email: 'mark@example.com',
          access_token: 'access-token',
          refresh_token: 'refresh-token'
        }
      ]
    });
  });
});
