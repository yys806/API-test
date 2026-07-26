export type OriginGuardEnv = {
  URL?: string;
  DEPLOY_PRIME_URL?: string;
  DEPLOY_URL?: string;
};

export type HeaderMap = Record<string, string | undefined>;

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getHeader(headers: HeaderMap, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

/**
 * 从 Netlify 构建环境变量收集允许的站点 origin。
 * URL 是生产域名,DEPLOY_PRIME_URL / DEPLOY_URL 覆盖分支预览与单次部署域名。
 */
export function buildAllowedOrigins(env: OriginGuardEnv): string[] {
  return [env.URL, env.DEPLOY_PRIME_URL, env.DEPLOY_URL]
    .map((value) => parseOrigin(value)?.origin)
    .filter((origin): origin is string => Boolean(origin));
}

/**
 * 校验请求是否来自本站页面(或本地开发环境)。
 * 优先看 Origin,缺失时退回 Referer;两者都没有或无法解析时拒绝,
 * 避免代理函数被任意第三方站点或脚本白嫖。
 */
export function isTrustedRequestOrigin(headers: HeaderMap, env: OriginGuardEnv): boolean {
  const source = parseOrigin(getHeader(headers, 'origin') ?? getHeader(headers, 'referer'));
  if (!source) return false;

  const hostname = source.hostname.replace(/^\[|\]$/g, '');
  if (LOCAL_HOSTNAMES.has(hostname)) return true;

  return buildAllowedOrigins(env).includes(source.origin);
}
