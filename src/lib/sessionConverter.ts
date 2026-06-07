export type OutputFormat = 'sub2api' | 'cpa' | 'cockpit' | '9router' | 'codex' | 'axonhub' | 'codex-manager';

type UnknownRecord = Record<string, unknown>;

export type ConversionIssue = {
  sourceName: string;
  path: string;
  reason: string;
};

export type SessionAccount = {
  sourceName: string;
  sourcePath?: string;
  email?: string;
  name: string;
  expiresAt?: string;
  accessTokenExpiresAt?: number;
  cpa: UnknownRecord;
  cockpit: UnknownRecord;
  nineRouter: UnknownRecord;
  codexAuthJson: UnknownRecord;
  axonHub: UnknownRecord;
  codexManager: UnknownRecord;
  sub2apiAccount: UnknownRecord;
};

export type ConversionResult = {
  accounts: SessionAccount[];
  skipped: number;
  issues: ConversionIssue[];
  output: string;
};

export const EXAMPLE_SESSION = {
  user: {
    id: 'user-example',
    email: 'mark@example.com'
  },
  expires: '2026-08-06T14:29:36.155Z',
  account: {
    id: '00000000-0000-4000-9000-000000000000',
    planType: 'plus'
  },
  accessToken: 'paste-real-access-token-here',
  sessionToken: 'paste-real-session-token-here',
  authProvider: 'openai'
};

const AXONHUB_PLACEHOLDER_REFRESH_TOKEN = '__missing_refresh_token__';

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64UrlJson(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64url');
  }

  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseJwtPayload(token?: string): UnknownRecord | undefined {
  if (!token) return undefined;
  const segments = token.split('.');
  if (segments.length < 2) return undefined;

  try {
    const parsed = JSON.parse(decodeBase64Url(segments[1]));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function authSection(payload?: UnknownRecord): UnknownRecord {
  const auth = payload?.['https://api.openai.com/auth'];
  return isRecord(auth) ? auth : {};
}

function profileSection(payload?: UnknownRecord): UnknownRecord {
  const profile = payload?.['https://api.openai.com/profile'];
  return isRecord(profile) ? profile : {};
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value > 1e11 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function timestampFromUnixSeconds(value: unknown): string | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const date = new Date(numeric * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function unixSecondsFromJwtExp(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : undefined;
}

function epochSecondsFromValue(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.trunc(numeric > 1e11 ? numeric / 1000 : numeric);

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.trunc(parsed / 1000) : 0;
}

function getExpiresIn(expiresAt?: string, now = new Date()): number | undefined {
  if (!expiresAt) return undefined;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return undefined;
  return Math.max(0, Math.floor((expiresMs - now.getTime()) / 1000));
}

function getAxonHubLastRefresh(expiresAt?: string, now = new Date()): string {
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  if (Number.isNaN(expiresMs)) return normalizeTimestamp(now) ?? now.toISOString();
  return new Date(expiresMs - 60 * 60 * 1000).toISOString();
}

function stripUnavailable<T>(value: T): T | undefined {
  if (Array.isArray(value)) {
    const stripped = value.map(stripUnavailable).filter((item) => item !== undefined);
    return stripped as T;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, stripUnavailable(item)] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length ? (Object.fromEntries(entries) as T) : undefined;
  }

  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

function toEmailKey(email?: string): string | undefined {
  return email
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildSyntheticCodexIdToken(email?: string, accountId?: string, planType?: string, userId?: string, expiresAt?: string): string | undefined {
  if (!accountId) return undefined;

  const now = Math.trunc(Date.now() / 1000);
  const authInfo: UnknownRecord = { chatgpt_account_id: accountId };
  const expires = epochSecondsFromValue(expiresAt) || now + 90 * 24 * 60 * 60;

  if (planType) authInfo.chatgpt_plan_type = planType;
  if (userId) {
    authInfo.chatgpt_user_id = userId;
    authInfo.user_id = userId;
  }

  const payload: UnknownRecord = {
    iat: now,
    exp: expires,
    'https://api.openai.com/auth': authInfo
  };
  if (email) payload.email = email;

  return `${encodeBase64UrlJson({ alg: 'none', typ: 'JWT', cpa_synthetic: true })}.${encodeBase64UrlJson(payload)}.synthetic`;
}

type SessionSource = {
  value: UnknownRecord;
  sourceName: string;
  path: string;
};

function collectSessionLikeObjects(value: unknown, sourceName = 'pasted-json'): SessionSource[] {
  const found: SessionSource[] = [];
  const visited = new WeakSet<object>();

  function visit(item: unknown, path: string) {
    if (!isRecord(item) && !Array.isArray(item)) return;

    if (isRecord(item)) {
      if (visited.has(item)) return;
      visited.add(item);

      const tokens = isRecord(item.tokens) ? item.tokens : {};
      const token = isRecord(item.token) ? item.token : {};
      const credentials = isRecord(item.credentials) ? item.credentials : {};
      const meta = isRecord(item.meta) ? item.meta : {};
      const providerSpecificData = isRecord(item.providerSpecificData) ? item.providerSpecificData : {};
      const accessToken = firstNonEmpty(
        item.accessToken,
        item.access_token,
        tokens.accessToken,
        tokens.access_token,
        token.accessToken,
        token.access_token,
        credentials.accessToken,
        credentials.access_token
      );
      const hasIdentity =
        isRecord(item.user) ||
        Boolean(firstNonEmpty(item.type, credentials.type)) ||
        Boolean(
          firstNonEmpty(
            item.email,
            item.name,
            item.label,
            meta.label,
            tokens.accountId,
            tokens.account_id,
            tokens.chatgptAccountId,
            tokens.chatgpt_account_id,
            providerSpecificData.chatgptAccountId,
            providerSpecificData.chatgpt_account_id,
            item.id
          )
        );

      if (accessToken && hasIdentity) {
        found.push({ value: item, sourceName, path });
        return;
      }

      for (const [key, child] of Object.entries(item)) {
        if (key === 'accessToken' || key === 'access_token' || key === 'sessionToken') continue;
        visit(child, `${path}.${key}`);
      }
      return;
    }

    item.forEach((child, index) => visit(child, `${path}[${index}]`));
  }

  visit(value, '$');
  return found;
}

function parseInputDocuments(text: string): { sources: SessionSource[]; issues: ConversionIssue[] } {
  if (!text.trim()) return { sources: [], issues: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      sources: [],
      issues: [
        {
          sourceName: 'pasted-json',
          path: '$',
          reason: `JSON 解析失败：${error instanceof Error ? error.message : '输入不是有效 JSON'}`
        }
      ]
    };
  }

  const sources = collectSessionLikeObjects(parsed);
  if (!sources.length) {
    return {
      sources,
      issues: [
        {
          sourceName: 'pasted-json',
          path: '$',
          reason: '未找到包含 accessToken 和 user/email 的 session 对象'
        }
      ]
    };
  }

  return { sources, issues: [] };
}

function convertSession(record: UnknownRecord, options: { now: Date; sourceName: string; sourcePath?: string }): SessionAccount {
  const tokens = isRecord(record.tokens) ? record.tokens : {};
  const token = isRecord(record.token) ? record.token : {};
  const credentials = isRecord(record.credentials) ? record.credentials : {};
  const user = isRecord(record.user) ? record.user : {};
  const account = isRecord(record.account) ? record.account : {};
  const meta = isRecord(record.meta) ? record.meta : {};
  const providerSpecificData = isRecord(record.providerSpecificData) ? record.providerSpecificData : {};

  const accessToken = firstNonEmpty(
    record.accessToken,
    record.access_token,
    tokens.accessToken,
    tokens.access_token,
    token.accessToken,
    token.access_token,
    credentials.accessToken,
    credentials.access_token
  );
  if (!accessToken) throw new Error('缺少 accessToken');

  const sessionToken = firstNonEmpty(record.sessionToken, record.session_token, tokens.sessionToken, tokens.session_token, token.sessionToken, token.session_token, credentials.session_token);
  const refreshToken = firstNonEmpty(record.refreshToken, record.refresh_token, tokens.refreshToken, tokens.refresh_token, token.refreshToken, token.refresh_token, credentials.refresh_token);
  const inputIdToken = firstNonEmpty(record.idToken, record.id_token, tokens.idToken, tokens.id_token, token.idToken, token.id_token, credentials.id_token);

  const payload = parseJwtPayload(accessToken);
  const idPayload = parseJwtPayload(inputIdToken);
  const auth = authSection(payload);
  const idAuth = authSection(idPayload);
  const profile = profileSection(payload);
  const exportedAt = normalizeTimestamp(options.now) ?? options.now.toISOString();
  const accessTokenExpiresAt = unixSecondsFromJwtExp(payload?.exp);
  const expiresAt = firstNonEmpty(timestampFromUnixSeconds(payload?.exp), normalizeTimestamp(record.expires), normalizeTimestamp(record.expiresAt), normalizeTimestamp(record.expired), normalizeTimestamp(record.expires_at));
  const email = firstNonEmpty(user.email, record.email, meta.label, record.label, credentials.email, providerSpecificData.email, profile.email, idPayload?.email, payload?.email);
  const accountId = firstNonEmpty(
    account.id,
    record.account_id,
    tokens.accountId,
    tokens.account_id,
    record.chatgptAccountId,
    record.chatgpt_account_id,
    meta.chatgptAccountId,
    meta.chatgpt_account_id,
    tokens.chatgptAccountId,
    tokens.chatgpt_account_id,
    providerSpecificData.chatgptAccountId,
    providerSpecificData.chatgpt_account_id,
    credentials.chatgpt_account_id,
    auth.chatgpt_account_id,
    idAuth.chatgpt_account_id,
    record.provider === 'codex' ? record.id : undefined
  );
  const chatgptAccountId = firstNonEmpty(record.chatgptAccountId, record.chatgpt_account_id, meta.chatgptAccountId, meta.chatgpt_account_id, tokens.chatgptAccountId, tokens.chatgpt_account_id, providerSpecificData.chatgptAccountId, providerSpecificData.chatgpt_account_id, credentials.chatgpt_account_id, auth.chatgpt_account_id, idAuth.chatgpt_account_id);
  const workspaceId = firstNonEmpty(account.workspaceId, account.workspace_id, record.workspaceId, record.workspace_id, meta.workspaceId, meta.workspace_id, providerSpecificData.workspaceId, providerSpecificData.workspace_id, credentials.workspace_id, payload?.workspace_id, idPayload?.workspace_id);
  const userId = firstNonEmpty(user.id, record.user_id, record.chatgptUserId, providerSpecificData.chatgptUserId, providerSpecificData.chatgpt_user_id, auth.chatgpt_user_id, auth.user_id, idAuth.chatgpt_user_id, idAuth.user_id);
  const planType = firstNonEmpty(account.planType, account.plan_type, record.planType, record.plan_type, providerSpecificData.chatgptPlanType, providerSpecificData.chatgpt_plan_type, credentials.plan_type, auth.chatgpt_plan_type, idAuth.chatgpt_plan_type);
  const expiresIn = getExpiresIn(expiresAt, options.now);
  const sourceType = record.provider === 'codex' && record.authType === 'oauth' ? '9router' : 'chatgpt_web_session';
  const name = firstNonEmpty(email, options.sourceName, 'ChatGPT Account') ?? 'ChatGPT Account';
  const syntheticIdToken = !inputIdToken ? buildSyntheticCodexIdToken(email, accountId, planType, userId, expiresAt) : undefined;
  const idToken = firstNonEmpty(inputIdToken, syntheticIdToken);

  const cpa = stripUnavailable({
    type: 'codex',
    account_id: accountId,
    chatgpt_account_id: accountId,
    email,
    name,
    plan_type: planType,
    chatgpt_plan_type: planType,
    id_token: idToken,
    id_token_synthetic: Boolean(syntheticIdToken) || undefined,
    access_token: accessToken,
    refresh_token: refreshToken || '',
    session_token: sessionToken,
    last_refresh: exportedAt,
    expired: expiresAt,
    disabled: Boolean(record.disabled) || undefined
  }) ?? {};

  const cockpit = stripUnavailable({
    type: 'codex',
    id_token: idToken,
    access_token: accessToken,
    refresh_token: refreshToken || '',
    account_id: accountId,
    last_refresh: exportedAt,
    email,
    expired: expiresAt,
    account_note: firstNonEmpty(record.account_note, record.accountInfo, record.account_info, record.note, record.notes, record.remark)
  }) ?? {};

  const sub2apiAccount =
    stripUnavailable({
      name,
      platform: 'openai',
      type: 'oauth',
      expires_at: accessTokenExpiresAt,
      auto_pause_on_expired: true,
      concurrency: 10,
      priority: 1,
      credentials: {
        access_token: accessToken,
        chatgpt_account_id: accountId,
        chatgpt_user_id: userId,
        email,
        expires_at: expiresAt,
        expires_in: expiresIn,
        plan_type: planType
      },
      extra: {
        email,
        email_key: toEmailKey(email),
        name,
        auth_provider: firstNonEmpty(record.authProvider, record.auth_provider),
        source: sourceType,
        last_refresh: exportedAt
      }
    }) ?? {};

  const priority = Number.isFinite(Number(record.priority)) ? Number(record.priority) : 9;
  const isActive = typeof record.isActive === 'boolean' ? record.isActive : !Boolean(record.disabled);
  const createdAt = normalizeTimestamp(record.createdAt) || exportedAt;
  const updatedAt = normalizeTimestamp(record.updatedAt) || exportedAt;
  const nineRouter =
    stripUnavailable({
      accessToken,
      refreshToken,
      expiresAt,
      testStatus: firstNonEmpty(record.testStatus, record.test_status, 'active'),
      expiresIn,
      providerSpecificData: {
        chatgptAccountId: accountId,
        chatgptPlanType: planType
      },
      id: accountId,
      provider: 'codex',
      authType: 'oauth',
      name,
      email,
      priority,
      isActive,
      createdAt,
      updatedAt
    }) ?? {};

  const codexAuthJson = {
    auth_mode: 'chatgpt',
    OPENAI_API_KEY: null,
    tokens: {
      id_token: idToken,
      access_token: accessToken,
      refresh_token: refreshToken || '',
      account_id: accountId
    },
    last_refresh: exportedAt
  };

  const axonHub =
    stripUnavailable({
      auth_mode: 'chatgpt',
      last_refresh: getAxonHubLastRefresh(expiresAt, options.now),
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken || AXONHUB_PLACEHOLDER_REFRESH_TOKEN,
        id_token: idToken
      },
      axonhub_refresh_token_placeholder: refreshToken ? undefined : true,
      axonhub_note: refreshToken ? undefined : 'refresh_token is a placeholder; access_token works only until it expires.'
    }) ?? {};

  const codexManagerTokenHints = stripUnavailable({
    account_id: accountId,
    chatgpt_account_id: chatgptAccountId
  });
  const codexManagerMeta =
    stripUnavailable({
      label: name,
      workspace_id: workspaceId,
      chatgpt_account_id: chatgptAccountId,
      note: 'Imported from ChatGPT session'
    }) ?? {};
  const codexManager = {
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken || '',
      id_token: inputIdToken || '',
      ...(isRecord(codexManagerTokenHints) ? codexManagerTokenHints : {})
    },
    meta: codexManagerMeta
  };

  return {
    sourceName: options.sourceName,
    sourcePath: options.sourcePath,
    email,
    name,
    expiresAt,
    accessTokenExpiresAt,
    cpa,
    cockpit,
    nineRouter,
    codexAuthJson,
    axonHub,
    codexManager,
    sub2apiAccount
  };
}

function buildSub2apiDocument(accounts: SessionAccount[], now = new Date()) {
  return {
    exported_at: normalizeTimestamp(now) ?? now.toISOString(),
    proxies: [],
    accounts: accounts.map((item) => item.sub2apiAccount)
  };
}

function outputDocument(accounts: SessionAccount[], format: OutputFormat, now: Date): unknown {
  if (format === 'sub2api') return buildSub2apiDocument(accounts, now);

  const pick = {
    cpa: (item: SessionAccount) => item.cpa,
    cockpit: (item: SessionAccount) => item.cockpit,
    '9router': (item: SessionAccount) => item.nineRouter,
    codex: (item: SessionAccount) => item.codexAuthJson,
    axonhub: (item: SessionAccount) => item.axonHub,
    'codex-manager': (item: SessionAccount) => item.codexManager
  }[format];

  const documents = accounts.map(pick);
  return documents.length === 1 ? documents[0] : documents;
}

export function convertSessionInput(input: string, format: OutputFormat, now = new Date()): ConversionResult {
  const parsed = parseInputDocuments(input);
  const accounts: SessionAccount[] = [];
  const issues: ConversionIssue[] = [...parsed.issues];

  for (const [index, source] of parsed.sources.entries()) {
    try {
      accounts.push(
        convertSession(source.value, {
          now,
          sourceName: source.sourceName,
          sourcePath: source.path || `$[${index}]`
        })
      );
    } catch (error) {
      issues.push({
        sourceName: source.sourceName,
        path: source.path,
        reason: error instanceof Error ? error.message : '无法转换'
      });
    }
  }

  return {
    accounts,
    skipped: issues.length,
    issues,
    output: accounts.length ? JSON.stringify(outputDocument(accounts, format, now), null, 2) : ''
  };
}

function sanitizeFileToken(value?: string, fallback = 'chatgpt-session'): string {
  const base = firstNonEmpty(value, fallback) ?? fallback;
  return (
    base
      .replace(/\.[^.]+$/u, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || fallback
  );
}

function getTimestampToken(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function buildDownloadFileName(accounts: SessionAccount[], format: OutputFormat, now = new Date()): string {
  const first = accounts[0];
  const base = sanitizeFileToken(first?.email || first?.name || format);
  return `${base}.${format}.${getTimestampToken(now)}.json`;
}
