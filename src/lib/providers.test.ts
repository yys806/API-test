import { describe, expect, it } from 'vitest';
import { getProviderById, normalizeBaseUrl, PROVIDERS } from './providers';

describe('provider presets', () => {
  it('includes built-in providers for common model APIs', () => {
    expect(PROVIDERS.map((provider) => provider.id)).toEqual([
      'deepseek',
      'siliconflow',
      'openrouter',
      'openai',
      'claude',
      'custom'
    ]);
  });

  it('returns stable defaults for OpenAI-compatible providers', () => {
    expect(getProviderById('deepseek')).toMatchObject({
      baseUrl: 'https://api.deepseek.com/v1',
      endpointType: 'openai-compatible',
      defaultModel: 'deepseek-chat'
    });
    expect(getProviderById('openrouter')).toMatchObject({
      baseUrl: 'https://openrouter.ai/api/v1',
      endpointType: 'openai-compatible'
    });
  });

  it('normalizes base URLs without losing version paths', () => {
    expect(normalizeBaseUrl(' https://api.openai.com/v1/ ')).toBe('https://api.openai.com/v1');
    expect(normalizeBaseUrl('https://api.deepseek.com')).toBe('https://api.deepseek.com');
    expect(normalizeBaseUrl('')).toBe('');
  });
});
