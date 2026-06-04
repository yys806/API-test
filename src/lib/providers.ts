export type EndpointType = 'openai-compatible' | 'anthropic';

export type ProviderPreset = {
  id: 'deepseek' | 'siliconflow' | 'openrouter' | 'openai' | 'claude' | 'custom';
  name: string;
  baseUrl: string;
  defaultModel: string;
  endpointType: EndpointType;
  accent: string;
  note: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    endpointType: 'openai-compatible',
    accent: '#2f6df6',
    note: 'OpenAI-compatible chat completions'
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    endpointType: 'openai-compatible',
    accent: '#0f9f6e',
    note: 'OpenAI-compatible model gateway'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    endpointType: 'openai-compatible',
    accent: '#f97316',
    note: 'Multi-provider OpenAI-compatible router'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    endpointType: 'openai-compatible',
    accent: '#111827',
    note: 'Official OpenAI chat completions'
  },
  {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-latest',
    endpointType: 'anthropic',
    accent: '#b06032',
    note: 'Anthropic Messages API'
  },
  {
    id: 'custom',
    name: 'Custom',
    baseUrl: '',
    defaultModel: '',
    endpointType: 'openai-compatible',
    accent: '#4b5563',
    note: 'Bring any compatible endpoint'
  }
];

export function getProviderById(id: ProviderPreset['id']): ProviderPreset {
  return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}
