export interface NpmConfig {
    email: string;
    password: string;
    timeoutMs: number;
    url: string;
}

export interface Config {
    authToken: string | undefined;
    host: string;
    npm: NpmConfig;
    path: string;
    port: number;
    readOnly: boolean;
    toolsAllow: string[];
    toolsDeny: string[];
}

type Env = Record<string, string | undefined>;

export function parseList(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    throw new Error(`Invalid boolean value "${value}"`);
}

function parseInteger(name: string, value: string | undefined, fallback: number, min: number, max: number): number {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`Invalid ${name} "${value}"`);
    }
    return parsed;
}

function parsePath(value: string | undefined): string {
    const path = (value ?? '/mcp').trim() || '/mcp';
    return path.startsWith('/') ? path : `/${path}`;
}

function parseUrl(value: string | undefined): string {
    const raw = value?.trim();
    if (!raw) {
        throw new Error('NPM_URL is required (e.g. http://nginx-proxy-manager:81)');
    }

    let url: URL;
    try {
        url = new URL(raw);
    }
    catch {
        throw new Error(`Invalid NPM_URL "${raw}"`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`NPM_URL must use http or https, got "${url.protocol}"`);
    }

    // Accept both "http://host:81" and "http://host:81/api".
    return url.toString().replace(/\/+$/, '').replace(/\/api$/, '');
}

function required(env: Env, name: string): string {
    const value = env[name];
    if (!value || value.trim() === '') {
        throw new Error(`${name} is required`);
    }
    return value;
}

export function loadConfig(env: Env = process.env): Config {
    return {
        host:       env.HOST?.trim() || '0.0.0.0',
        port:       parseInteger('PORT', env.PORT, 3000, 1, 65535),
        path:       parsePath(env.MCP_PATH),
        readOnly:   parseBoolean(env.MCP_READ_ONLY, true),
        toolsAllow: parseList(env.MCP_TOOLS_ALLOW),
        toolsDeny:  parseList(env.MCP_TOOLS_DENY),
        authToken:  env.MCP_AUTH_TOKEN?.trim() || undefined,
        npm:        {
            url:       parseUrl(env.NPM_URL),
            email:     required(env, 'NPM_EMAIL').trim(),
            password:  required(env, 'NPM_PASSWORD'),
            timeoutMs: parseInteger('NPM_TIMEOUT_MS', env.NPM_TIMEOUT_MS, 30000, 1000, 600000),
        },
    };
}
