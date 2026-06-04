import { describe, expect, it } from 'vitest';
import { buildProviderRequest, type ChatMessage } from './apiRequest';

const messages: ChatMessage[] = [{ role: 'user', content: 'ping' }];

describe('buildProviderRequest', () => {
  it('builds an OpenAI-compatible chat completions request', () => {
    const request = buildProviderRequest({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      endpointType: 'openai-compatible',
      messages
    });

    expect(request.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(request.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(request.body)).toMatchObject({
      model: 'gpt-4o-mini',
      messages
    });
  });

  it('builds an Anthropic Messages API request', () => {
    const request = buildProviderRequest({
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'sk-ant-test',
      model: 'claude-3-5-sonnet-latest',
      endpointType: 'anthropic',
      messages
    });

    expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request.headers['x-api-key']).toBe('sk-ant-test');
    expect(request.headers['anthropic-version']).toBe('2023-06-01');
    expect(JSON.parse(request.body)).toMatchObject({
      model: 'claude-3-5-sonnet-latest',
      messages,
      max_tokens: 1024
    });
  });
});
