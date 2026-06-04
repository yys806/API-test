import { normalizeBaseUrl, type EndpointType } from './providers';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProviderRequestInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  endpointType: EndpointType;
  messages: ChatMessage[];
};

export type ProviderHttpRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export function buildProviderRequest(input: ProviderRequestInput): ProviderHttpRequest {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!baseUrl) throw new Error('Base URL is required.');
  if (!input.apiKey.trim()) throw new Error('API key is required.');
  if (!input.model.trim()) throw new Error('Model name is required.');
  if (input.messages.length === 0) throw new Error('At least one message is required.');

  if (input.endpointType === 'anthropic') {
    return {
      url: `${baseUrl}/v1/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        max_tokens: 1024
      })
    };
  }

  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: 0.7
    })
  };
}

export function extractAssistantText(endpointType: EndpointType, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;

  if (endpointType === 'anthropic') {
    const content = Array.isArray(data.content) ? data.content : [];
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        const text = (part as Record<string, unknown>).text;
        return typeof text === 'string' ? text : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return '';
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' ? content : '';
}
