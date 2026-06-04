import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  Eraser,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageSquareText,
  RadioTower,
  Send,
  Server,
  Sparkles,
  Zap
} from 'lucide-react';
import { getProviderById, PROVIDERS, type EndpointType, type ProviderPreset } from './lib/providers';
import type { ChatMessage } from './lib/apiRequest';

type UiMessage = ChatMessage & {
  id: string;
  latencyMs?: number;
  status?: number;
  raw?: unknown;
  error?: string;
};

type ChatResponse = {
  ok: boolean;
  latencyMs: number;
  status: number;
  text?: string;
  raw?: unknown;
  error?: unknown;
};

const initialProvider = getProviderById('deepseek');

function formatMs(ms?: number): string {
  if (typeof ms !== 'number') return '--';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stringifyError(error: unknown): string {
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Unknown error';
  }
}

export function App() {
  const [providerId, setProviderId] = useState<ProviderPreset['id']>(initialProvider.id);
  const [baseUrl, setBaseUrl] = useState(initialProvider.baseUrl);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(initialProvider.defaultModel);
  const [endpointType, setEndpointType] = useState<EndpointType>(initialProvider.endpointType);
  const [input, setInput] = useState('你好，请用一句话回复 API 连通性测试。');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [expandedRawId, setExpandedRawId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeProvider = useMemo(() => getProviderById(providerId), [providerId]);
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const lastStatus = lastAssistant?.status;
  const lastLatency = lastAssistant?.latencyMs;
  const conversationMessages: ChatMessage[] = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map(({ role, content }) => ({ role, content }));

  function applyProvider(provider: ProviderPreset) {
    setProviderId(provider.id);
    setBaseUrl(provider.baseUrl);
    setModel(provider.defaultModel);
    setEndpointType(provider.endpointType);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const userMessage: UiMessage = { id: makeId('user'), role: 'user', content };
    const pendingMessages = [...conversationMessages, { role: 'user' as const, content }];
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);

    const startedAt = performance.now();

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          model,
          endpointType,
          messages: pendingMessages
        })
      });
      const payload = (await response.json()) as ChatResponse;
      const measuredLatency = Math.round(performance.now() - startedAt);

      if (!response.ok || !payload.ok) {
        setMessages((current) => [
          ...current,
          {
            id: makeId('assistant-error'),
            role: 'assistant',
            content: '请求失败。请检查 Base URL、API key、模型名和供应商类型。',
            latencyMs: payload.latencyMs || measuredLatency,
            status: payload.status || response.status,
            raw: payload.error,
            error: stringifyError(payload.error)
          }
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: makeId('assistant'),
          role: 'assistant',
          content: payload.text || '接口返回成功，但没有提取到文本内容。可展开 Raw 查看原始响应。',
          latencyMs: payload.latencyMs || measuredLatency,
          status: payload.status || response.status,
          raw: payload.raw
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId('assistant-network-error'),
          role: 'assistant',
          content: '网络或代理函数调用失败。',
          latencyMs: Math.round(performance.now() - startedAt),
          status: 0,
          error: stringifyError(error),
          raw: error instanceof Error ? error.message : error
        }
      ]);
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <form className="config-panel" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <div className="brand">
            <span className="brand-mark">
              <RadioTower size={22} />
            </span>
            <div>
              <p>API KEY TESTER</p>
              <h1>模型连通性工作台</h1>
            </div>
          </div>

          <div className="provider-grid" aria-label="供应商预设">
            {PROVIDERS.map((provider) => (
              <button
                className={`provider-chip ${provider.id === providerId ? 'active' : ''}`}
                key={provider.id}
                onClick={() => applyProvider(provider)}
                style={{ '--provider-color': provider.accent } as React.CSSProperties}
                type="button"
                title={provider.note}
              >
                <span>{provider.name}</span>
                {provider.id === providerId ? <Check size={15} /> : null}
              </button>
            ))}
          </div>

          <label className="field">
            <span>
              <Server size={16} />
              Base URL
            </span>
            <input
              id="base-url"
              name="baseUrl"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </label>

          <label className="field">
            <span>
              <KeyRound size={16} />
              API Key
            </span>
            <div className="secret-row">
              <input
                id="api-key"
                name="apiKey"
                autoComplete="new-password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                type={showKey ? 'text' : 'password'}
              />
              <button type="button" onClick={() => setShowKey((current) => !current)} title={showKey ? '隐藏密钥' : '显示密钥'}>
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <label className="field">
            <span>
              <Sparkles size={16} />
              Model
            </span>
            <input
              id="model"
              name="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="model-name"
              list={activeProvider.models?.length ? 'model-options' : undefined}
            />
            {activeProvider.models?.length ? (
              <datalist id="model-options">
                {activeProvider.models.map((modelName) => (
                  <option key={modelName} value={modelName} />
                ))}
              </datalist>
            ) : null}
          </label>

          <label className="field">
            <span>
              <Zap size={16} />
              API Type
            </span>
            <select id="endpoint-type" name="endpointType" value={endpointType} onChange={(event) => setEndpointType(event.target.value as EndpointType)}>
              <option value="openai-compatible">OpenAI compatible</option>
              <option value="anthropic">Anthropic Messages</option>
            </select>
          </label>

          <div className="status-stack">
            <div className="metric-tile">
              <Clock3 size={17} />
              <span>Latency</span>
              <strong>{formatMs(lastLatency)}</strong>
            </div>
            <div className="metric-tile">
              <Activity size={17} />
              <span>Status</span>
              <strong>{lastStatus ?? '--'}</strong>
            </div>
          </div>

          <button className="clear-button" type="button" onClick={() => setMessages([])}>
            <Eraser size={17} />
            清空对话
          </button>
        </form>

        <section className="chat-panel">
          <header className="chat-header">
            <div>
              <p>{activeProvider.note}</p>
              <h2>{activeProvider.name} / {model || '未设置模型'}</h2>
            </div>
            <span className={`health-badge ${lastAssistant?.error ? 'bad' : lastStatus ? 'good' : ''}`}>
              {lastAssistant?.error ? <AlertTriangle size={15} /> : <MessageSquareText size={15} />}
              {lastAssistant?.error ? 'Error' : lastStatus ? 'Ready' : 'Idle'}
            </span>
          </header>

          <div className="message-log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-orbit">
                  <MessageSquareText size={34} />
                </div>
                <h2>填入密钥，发送一条消息。</h2>
                <p>响应会在这里显示，同时记录延迟、状态码和原始返回。</p>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-meta">
                    <strong>{message.role === 'user' ? 'You' : activeProvider.name}</strong>
                    {message.latencyMs !== undefined ? <span>{formatMs(message.latencyMs)}</span> : null}
                    {message.status !== undefined ? <span>HTTP {message.status}</span> : null}
                  </div>
                  <p>{message.content}</p>
                  {message.error ? <pre className="error-block">{message.error}</pre> : null}
                  {message.raw !== undefined ? (
                    <button className="raw-toggle" type="button" onClick={() => setExpandedRawId(expandedRawId === message.id ? null : message.id)}>
                      Raw response
                      <ChevronDown className={expandedRawId === message.id ? 'up' : ''} size={15} />
                    </button>
                  ) : null}
                  {expandedRawId === message.id ? <pre className="raw-block">{stringifyError(message.raw)}</pre> : null}
                </article>
              ))
            )}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              id="message"
              name="message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入测试消息..."
              rows={3}
            />
            <button disabled={isSending || !input.trim()} type="submit" title="发送测试消息">
              {isSending ? <Loader2 className="spin" size={19} /> : <Send size={19} />}
              <span>{isSending ? '测试中' : '发送'}</span>
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
