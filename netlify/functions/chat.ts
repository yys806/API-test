import type { Handler } from '@netlify/functions';
import { buildProviderRequest, extractAssistantText, type ChatMessage } from '../../src/lib/apiRequest';
import type { EndpointType } from '../../src/lib/providers';

type ChatRequest = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  endpointType?: EndpointType;
  messages?: ChatMessage[];
};

const jsonHeaders = {
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed.' })
    };
  }

  const startedAt = Date.now();

  try {
    const body = JSON.parse(event.body ?? '{}') as ChatRequest;
    const upstreamRequest = buildProviderRequest({
      baseUrl: body.baseUrl ?? '',
      apiKey: body.apiKey ?? '',
      model: body.model ?? '',
      endpointType: body.endpointType ?? 'openai-compatible',
      messages: body.messages ?? []
    });

    const response = await fetch(upstreamRequest.url, {
      method: 'POST',
      headers: upstreamRequest.headers,
      body: upstreamRequest.body
    });
    const latencyMs = Date.now() - startedAt;
    const rawText = await response.text();
    let payload: unknown = rawText;

    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { text: rawText };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          ok: false,
          latencyMs,
          status: response.status,
          error: payload
        })
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: true,
        latencyMs,
        status: response.status,
        text: extractAssistantText(body.endpointType ?? 'openai-compatible', payload),
        raw: payload
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        ok: false,
        latencyMs: Date.now() - startedAt,
        status: 400,
        error: error instanceof Error ? error.message : 'Unknown request error.'
      })
    };
  }
};
