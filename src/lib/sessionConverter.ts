export type OutputFormat = 'sub2api' | 'cpa' | 'cockpit' | '9router' | 'codex' | 'axonhub' | 'codex-manager';

export type SessionAccount = {
  email?: string;
  type: string;
  access_token: string;
  refresh_token?: string;
};

export type ConversionResult = {
  accounts: SessionAccount[];
  skipped: number;
  output: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAccount(value: unknown): SessionAccount | null {
  if (!isRecord(value)) return null;

  const accessToken = value.access_token ?? value.accessToken;
  const refreshToken = value.refresh_token ?? value.refreshToken;
  const user = isRecord(value.user) ? value.user : undefined;
  const email = typeof value.email === 'string' ? value.email : typeof user?.email === 'string' ? user.email : undefined;

  if (typeof accessToken !== 'string' || !accessToken) return null;

  return {
    email,
    type: typeof value.type === 'string' ? value.type : 'chatgpt',
    access_token: accessToken,
    refresh_token: typeof refreshToken === 'string' ? refreshToken : undefined
  };
}

function parseInput(input: string): { accounts: SessionAccount[]; skipped: number } {
  const trimmed = input.trim();
  if (!trimmed) return { accounts: [], skipped: 0 };

  const chunks = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') || line.startsWith('['));

  const rawValues: unknown[] = [];
  let skipped = 0;

  if (chunks.length > 1) {
    for (const chunk of chunks) {
      try {
        rawValues.push(JSON.parse(chunk));
      } catch {
        skipped += 1;
      }
    }
  } else {
    try {
      const parsed = JSON.parse(trimmed);
      rawValues.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      skipped += 1;
    }
  }

  const accounts = rawValues.flatMap((value) => {
    if (Array.isArray(value)) return value.map(normalizeAccount).filter(Boolean) as SessionAccount[];
    const account = normalizeAccount(value);
    return account ? [account] : [];
  });

  skipped += rawValues.length - accounts.length;

  return { accounts, skipped };
}

function formatAccounts(accounts: SessionAccount[], format: OutputFormat): unknown {
  if (format === 'sub2api') {
    return accounts.map((account) => ({
      platform: 'openai',
      credentials: {
        type: account.type,
        access_token: account.access_token,
        refresh_token: account.refresh_token
      }
    }));
  }

  if (format === 'cpa') {
    return {
      accounts: accounts.map((account) => ({
        email: account.email,
        access_token: account.access_token,
        refresh_token: account.refresh_token
      }))
    };
  }

  return accounts.map((account) => ({
    email: account.email,
    type: account.type,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    target: format
  }));
}

export function convertSessionInput(input: string, format: OutputFormat): ConversionResult {
  const parsed = parseInput(input);
  return {
    ...parsed,
    output: JSON.stringify(formatAccounts(parsed.accounts, format), null, 2)
  };
}
