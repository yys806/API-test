import { type CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  Code2,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Send,
  Server,
  Upload,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tv,
  WalletCards,
  Zap
} from 'lucide-react';
import { getProviderById, PROVIDERS, type EndpointType, type ProviderPreset } from './lib/providers';
import type { ChatMessage } from './lib/apiRequest';
import { buildDownloadFileName, convertSessionInput, EXAMPLE_SESSION, type OutputFormat } from './lib/sessionConverter';

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

type ModuleId = 'api' | 'pricing' | 'shops' | 'bilibili' | 'status' | 'convert' | 'shen' | 'friends';

type PriceResponse = {
  ok: boolean;
  updatedAt: string;
  sources: Array<{ provider: string; title: string; url: string }>;
  exchange?: { updatedAt: string; base: string };
  plans: Array<{ id: string; productName: string; name: string; period: string; updatedAt: string; source: string; sourceLabel: string; count: number }>;
  selectedPlanId: string | null;
  regions: Array<{ country: string; flag?: string; currency: string; localPrice: string; usd?: number; cny: number; displayPrice: string; exchangeSource: string }>;
  rankingsByPlan?: Record<string, Array<{ country: string; flag?: string; currency: string; localPrice: string; usd?: number; cny: number; displayPrice: string; exchangeSource: string }>>;
  errors?: string[];
};

type ShopResponse = {
  ok: boolean;
  updatedAt: string;
  mode: 'public-search' | 'needs-merchant-api';
  note: string;
  keywords: string[];
  products: Array<{
    platform: string;
    sourceUrl: string;
    name: string;
    price: number;
    stock: string;
    category: string;
    available: boolean;
    shopName?: string;
    sales?: number;
  }>;
  errors?: string[];
};

type StatusResponse = {
  ok: boolean;
  updatedAt: string;
  providers: Array<{
    provider: string;
    sourceUrl: string;
    indicator: string;
    description: string;
    components: Array<{ name: string; status: string }>;
    incidents: Array<{ name: string; status: string; url?: string }>;
  }>;
  errors?: string[];
};

type BilibiliResponse = {
  ok: boolean;
  updatedAt: string;
  sourceUrl: string;
  rule: string;
  keywords?: string[];
  items: Array<{ title: string; url: string; views: number; publishedAt: string; author?: string; summary: string }>;
  errors?: string[];
};

const initialProvider = getProviderById('deepseek');

const modules: Array<{ id: ModuleId; label: string; eyebrow: string; icon: typeof RadioTower }> = [
  { id: 'api', label: 'API 测试', eyebrow: 'Key Lab', icon: RadioTower },
  { id: 'pricing', label: '官方价格', eyebrow: 'Pricing', icon: WalletCards },
  { id: 'shops', label: '低价渠道', eyebrow: 'Shops', icon: ShoppingBag },
  { id: 'bilibili', label: 'B 站监测', eyebrow: 'Bilibili', icon: Tv },
  { id: 'status', label: '官方状态', eyebrow: 'Status', icon: ShieldCheck },
  { id: 'convert', label: 'JSON 转换', eyebrow: 'Convert', icon: Code2 },
  { id: 'shen', label: 'Shen 入口', eyebrow: 'Shen AI', icon: Sparkles },
  { id: 'friends', label: '友情中转', eyebrow: 'Links', icon: LinkIcon }
];

const shenLinks = [
  { title: 'Shen AI 中转站', url: 'https://skill-chat.cn', note: '主站入口' },
  { title: 'Shen AI 主小铺', url: 'https://catfk.com/shop/I8IXPSSZ', note: '云猫寄售公开店铺入口' },
  { title: 'Shen AI 副小铺', url: 'https://pay.ldxp.cn/shop/S5I572HE', note: '链动小铺' },
  { title: 'AI 生图站', url: 'https://shen-image.cc.cd/', note: '图片生成服务' }
];

const friendLinks = [
  { title: 'ZZSHU', url: 'https://zzshu.cc/' },
  { title: 'Kedaya Sub', url: 'https://sub.kedaya.xyz/' },
  { title: 'FZL AI', url: 'https://api.fzl-ai.top/' },
  { title: 'AI Pixel', url: 'https://ai-pixel.online/' }
];

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

function formatTime(value?: string): string {
  if (!value) return '--';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function useFunctionResource<T>(endpoint: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(endpoint);
      const payload = (await response.json()) as T;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '刷新失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, endpoint]);

  return { data, error, loading, refresh };
}

function PanelHeader({ title, eyebrow, description }: { title: string; eyebrow: string; description: string }) {
  return (
    <header className="panel-title">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span>{description}</span>
    </header>
  );
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button className="ghost-button" type="button" onClick={onClick} disabled={loading}>
      <RefreshCw className={loading ? 'spin' : ''} size={16} />
      刷新
    </button>
  );
}

function ExternalLinkCard({ title, url, note }: { title: string; url: string; note?: string }) {
  return (
    <a className="link-card" href={url} target="_blank" rel="noreferrer">
      <div>
        <strong>{title}</strong>
        {note ? <span>{note}</span> : null}
      </div>
      <ArrowUpRight size={18} />
    </a>
  );
}

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('api');
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
  const [sessionInput, setSessionInput] = useState('');
  const [sessionFormat, setSessionFormat] = useState<OutputFormat>('sub2api');
  const [pricingPlan, setPricingPlan] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeProvider = useMemo(() => getProviderById(providerId), [providerId]);
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const lastStatus = lastAssistant?.status;
  const lastLatency = lastAssistant?.latencyMs;
  const conversationMessages: ChatMessage[] = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map(({ role, content }) => ({ role, content }));
  const conversion = useMemo(() => convertSessionInput(sessionInput, sessionFormat), [sessionInput, sessionFormat]);
  const pricing = useFunctionResource<PriceResponse>('/.netlify/functions/pricing', activeModule === 'pricing');
  const shops = useFunctionResource<ShopResponse>('/.netlify/functions/shop-monitor', activeModule === 'shops');
  const officialStatus = useFunctionResource<StatusResponse>('/.netlify/functions/status', activeModule === 'status');
  const bilibili = useFunctionResource<BilibiliResponse>('/.netlify/functions/bilibili-monitor', activeModule === 'bilibili');
  const pricingPlanExists = Boolean(pricing.data?.plans.some((plan) => plan.id === pricingPlan));
  const selectedPricingPlanId = pricingPlanExists ? pricingPlan : pricing.data?.selectedPlanId || pricing.data?.plans[0]?.id || '';
  const selectedRegions = selectedPricingPlanId ? pricing.data?.rankingsByPlan?.[selectedPricingPlanId] ?? pricing.data?.regions ?? [] : pricing.data?.regions ?? [];

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

  async function copyConversion() {
    await navigator.clipboard.writeText(conversion.output);
  }

  function downloadConversion() {
    if (!conversion.output) return;
    const blob = new Blob([conversion.output], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildDownloadFileName(conversion.accounts, sessionFormat);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function readSessionFiles(files: FileList | null) {
    if (!files?.length) return;
    const jsonFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.json'));
    const contents = await Promise.all(
      jsonFiles.map(async (file) => {
        const text = await file.text();
        try {
          return JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          return text;
        }
      })
    );
    setSessionInput(contents.length === 1 ? contents[0] : `[${contents.join(',\n')}]`);
  }

  return (
    <main className="dashboard-shell">
      <aside className="side-nav">
        <div className="brand compact">
          <span className="brand-mark">
            <RadioTower size={22} />
          </span>
          <div>
            <p>SHEN AI HUB</p>
            <h1>Shen AI集合站</h1>
          </div>
        </div>
        <nav aria-label="模块导航">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                className={activeModule === module.id ? 'active' : ''}
                key={module.id}
                type="button"
                onClick={() => setActiveModule(module.id)}
              >
                <Icon size={18} />
                <span>{module.label}</span>
                <small>{module.eyebrow}</small>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="module-stage">
        {activeModule === 'api' ? (
          <section className="workspace api-workspace">
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
                    style={{ '--provider-color': provider.accent } as CSSProperties}
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
                <input id="base-url" name="baseUrl" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
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
        ) : null}

        {activeModule === 'pricing' ? (
          <section className="module-panel">
            <PanelHeader title="GPT / Claude 官方价格" eyebrow="Official pricing" description="直接解析地区订阅价格页，并用实时汇率重算人民币排名" />
            <div className="toolbar">
              <RefreshButton loading={pricing.loading} onClick={pricing.refresh} />
              <span>更新时间：{formatTime(pricing.data?.updatedAt)}</span>
              <span>汇率：{formatTime(pricing.data?.exchange?.updatedAt)}</span>
            </div>
            <div className="format-tabs">
              {pricing.data?.plans.map((plan) => (
                <button className={selectedPricingPlanId === plan.id ? 'active' : ''} type="button" key={plan.id} onClick={() => setPricingPlan(plan.id)}>
                  {plan.name}
                </button>
              ))}
            </div>
            <div className="price-grid">
              {selectedRegions.map((row, index) => (
                <article className="rank-card" key={`${row.country}-${row.localPrice}`}>
                  <span>#{index + 1}</span>
                  <strong>{row.flag ? `${row.flag} ` : ''}{row.country}</strong>
                  <p>
                    {row.localPrice}
                    {row.usd ? `，约 $${row.usd}` : ''}
                  </p>
                  <b>{row.displayPrice}</b>
                </article>
              ))}
            </div>
            {!pricing.loading && pricing.data && selectedRegions.length === 0 ? <p className="notice bad">暂时没有解析到地区价格。</p> : null}
            <div className="link-grid">
              {pricing.data?.sources.map((source) => <ExternalLinkCard key={source.url} title={source.title} url={source.url} note={source.provider} />)}
            </div>
            {pricing.data?.errors?.length ? <pre className="error-block">{pricing.data.errors.join('\n')}</pre> : null}
            {pricing.error ? <p className="notice bad">{pricing.error}</p> : null}
          </section>
        ) : null}

        {activeModule === 'shops' ? (
          <section className="module-panel">
            <PanelHeader title="低价 GPT 渠道监测" eyebrow="Shop monitor" description="优先搜索平台公开货源接口，不再抓取你自己的店铺作为结果" />
            <div className="toolbar">
              <RefreshButton loading={shops.loading} onClick={shops.refresh} />
              <span>更新时间：{formatTime(shops.data?.updatedAt)}</span>
              <span>{shops.data?.mode === 'public-search' ? '公开搜索' : '需要商家/API'}</span>
            </div>
            {shops.data?.note ? <p className={`notice ${shops.data.mode === 'needs-merchant-api' ? 'bad' : ''}`}>{shops.data.note}</p> : null}
            <div className="product-list wide">
              {shops.data?.products.map((product) => (
                <a className="product-row product-row-link" key={`${product.platform}-${product.sourceUrl}-${product.name}`} href={product.sourceUrl} target="_blank" rel="noreferrer">
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.platform}
                      {product.shopName ? ` / ${product.shopName}` : ''} / {product.category}
                    </span>
                  </div>
                  <b>¥{product.price}</b>
                  <em className={product.available ? 'ok' : 'bad'}>{product.stock}</em>
                </a>
              ))}
            </div>
            {!shops.loading && shops.data && shops.data.products.length === 0 ? (
              <div className="info-stack">
                <p className="notice">当前没有拿到公开货源列表。要把这里做成“实时查看成品号、Plus 代充、Team 号”，需要提供其中一种：商家中心登录态 Cookie、官方/后台 API 文档，或可在 Netlify 环境变量里配置的后台接口凭据。</p>
                <p className="notice">已确认的公开店铺接口只能查具体店铺商品，不适合当作平台级货源搜索；我也不会把你自己的店铺商品冒充成低价渠道结果。</p>
              </div>
            ) : null}
            {shops.data?.errors?.length ? (
              <details className="diagnostic-details">
                <summary>诊断信息</summary>
                <pre className="error-block">{shops.data.errors.join('\n')}</pre>
              </details>
            ) : null}
            {shops.error ? <p className="notice bad">{shops.error}</p> : null}
          </section>
        ) : null}

        {activeModule === 'bilibili' ? (
          <section className="module-panel">
            <PanelHeader title="B 站低价信息监测" eyebrow="Bilibili monitor" description="保留近 5 天播放量破万内容，并摘要公开方法" />
            <div className="toolbar">
              <RefreshButton loading={bilibili.loading} onClick={bilibili.refresh} />
              <span>更新时间：{formatTime(bilibili.data?.updatedAt)}</span>
            </div>
            <p className="notice">{bilibili.data?.rule}</p>
            <div className="story-list">
              {bilibili.data?.items.map((item) => (
                <a className="story-card" key={item.url} href={item.url} target="_blank" rel="noreferrer">
                  <strong>{item.title}</strong>
                  <span>
                    {item.views.toLocaleString('zh-CN')} 播放 / {formatTime(item.publishedAt)}
                    {item.author ? ` / ${item.author}` : ''}
                  </span>
                  <p>{item.summary}</p>
                </a>
              ))}
            </div>
            {!bilibili.loading && bilibili.data && bilibili.data.items.length === 0 ? <p className="notice">近 5 天暂未发现播放量破万的匹配视频。</p> : null}
            {bilibili.data?.errors?.length && bilibili.data.items.length === 0 ? (
              <details className="diagnostic-details" open>
                <summary>诊断信息</summary>
                <pre className="error-block">{bilibili.data.errors.join('\n')}</pre>
              </details>
            ) : null}
            {bilibili.error ? <p className="notice bad">{bilibili.error}</p> : null}
          </section>
        ) : null}

        {activeModule === 'status' ? (
          <section className="module-panel">
            <PanelHeader title="OpenAI / Claude 官方状态" eyebrow="Statuspage" description="来自官方 status summary API" />
            <div className="toolbar">
              <RefreshButton loading={officialStatus.loading} onClick={officialStatus.refresh} />
              <span>更新时间：{formatTime(officialStatus.data?.updatedAt)}</span>
            </div>
            <div className="status-grid">
              {officialStatus.data?.providers.map((provider) => (
                <article className="status-card" key={provider.provider}>
                  <div className="shop-card-head">
                    <h3>{provider.provider}</h3>
                    <a href={provider.sourceUrl} target="_blank" rel="noreferrer">
                      状态页 <ArrowUpRight size={14} />
                    </a>
                  </div>
                  <b className={`indicator ${provider.indicator}`}>{provider.description}</b>
                  <div className="component-grid">
                    {provider.components.slice(0, 8).map((component) => (
                      <span key={`${provider.provider}-${component.name}`}>
                        {component.name}: {component.status}
                      </span>
                    ))}
                  </div>
                  {provider.incidents.length ? <p className="notice bad">{provider.incidents[0].name}</p> : null}
                </article>
              ))}
            </div>
            {officialStatus.data?.errors?.length ? <pre className="error-block">{officialStatus.data.errors.join('\n')}</pre> : null}
          </section>
        ) : null}

        {activeModule === 'convert' ? (
          <section className="module-panel converter-panel">
            <PanelHeader title="ChatGPT Session JSON 转换" eyebrow="Local converter" description="本地解析，不上传 token，不写入存储" />
            <div className="format-tabs">
              {(['sub2api', 'cpa', 'cockpit', '9router', 'codex', 'axonhub', 'codex-manager'] as OutputFormat[]).map((format) => (
                <button className={sessionFormat === format ? 'active' : ''} type="button" key={format} onClick={() => setSessionFormat(format)}>
                  {format}
                </button>
              ))}
            </div>
            <div className="converter-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                multiple
                hidden
                onChange={(event) => {
                  void readSessionFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                选择 JSON 文件
              </button>
              <button className="ghost-button" type="button" onClick={() => setSessionInput(JSON.stringify(EXAMPLE_SESSION, null, 2))}>
                <Clipboard size={16} />
                加载示例
              </button>
              <button className="ghost-button" type="button" onClick={downloadConversion} disabled={!conversion.output}>
                <ArrowUpRight size={16} />
                下载 JSON
              </button>
            </div>
            <div className="converter-grid">
              <textarea
                value={sessionInput}
                onChange={(event) => setSessionInput(event.target.value)}
                placeholder='粘贴 ChatGPT session JSON、AT-only JSON，或导入一个/多个 JSON 文件。示例：{"type":"codex","access_token":"...","refresh_token":"..."}'
              />
              <textarea value={conversion.output} readOnly placeholder="转换后会显示 JSON。" />
            </div>
            <div className="toolbar">
              <span>{conversion.accounts.length} 个账号，跳过 {conversion.skipped} 项，当前格式 {sessionFormat}</span>
              <button className="ghost-button" type="button" onClick={copyConversion}>
                <Copy size={16} />
                复制输出
              </button>
              <button className="ghost-button" type="button" onClick={() => setSessionInput('')}>
                <Eraser size={16} />
                清空
              </button>
            </div>
            <p className="notice">CPA / Cockpit / Codex / AxonHub / Codex-Manager 的 401 测试通常只能验证 access token 是否有效，不代表 Plus、Pro、Team 权益一定可用。</p>
            <div className="account-table-wrap">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>Email</th>
                    <th>过期时间</th>
                    <th>来源</th>
                  </tr>
                </thead>
                <tbody>
                  {conversion.accounts.length ? (
                    conversion.accounts.map((account, index) => (
                      <tr key={`${account.sourceName}-${account.sourcePath}-${index}`}>
                        <td>{account.name || '-'}</td>
                        <td>{account.email || '-'}</td>
                        <td>{account.expiresAt ? formatTime(account.expiresAt) : '-'}</td>
                        <td>{account.sourceName || 'pasted-json'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>暂无可转换账号。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {conversion.issues.length ? (
              <div className="issue-list">
                {conversion.issues.map((issue, index) => (
                  <div key={`${issue.sourceName}-${issue.path}-${index}`}>
                    {issue.sourceName} {issue.path}: {issue.reason}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeModule === 'shen' ? (
          <section className="module-panel">
            <PanelHeader title="Shen AI 中转站" eyebrow="Jump links" description="主站、小铺和生图站快捷入口" />
            <div className="link-grid large">
              {shenLinks.map((link) => <ExternalLinkCard key={link.url} {...link} />)}
            </div>
            <p className="notice">副小铺私有 token 链接不直接展示在前端；需要自动抓取私有商品时请配置 Netlify 环境变量。</p>
          </section>
        ) : null}

        {activeModule === 'friends' ? (
          <section className="module-panel">
            <PanelHeader title="友情中转站" eyebrow="Relay links" description="常用友链入口" />
            <div className="link-grid large">
              {friendLinks.map((link) => <ExternalLinkCard key={link.url} {...link} />)}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
