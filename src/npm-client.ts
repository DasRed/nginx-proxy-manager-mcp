export class NpmError extends Error {
    readonly status: number | undefined;

    constructor(message: string, status?: number) {
        super(message);
        this.name   = 'NpmError';
        this.status = status;
    }
}

export interface NpmClientOptions {
    email: string;
    fetch?: typeof fetch;
    now?: () => number;
    password: string;
    timeoutMs: number;
    url: string;
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
    body?: unknown;
    query?: Query;
}

interface TokenResponse {
    expires?: string;
    requireTwoFactor?: boolean;
    token?: string;
}

/** Refresh the token this long before NPM considers it expired. */
const TOKEN_REFRESH_MARGIN_MS   = 60_000;
/** Fallback lifetime when NPM does not send an expiry. */
const DEFAULT_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

export function assertId(value: number, name: string): number {
    if (!Number.isInteger(value) || value < 1) {
        throw new NpmError(`${name} must be a positive integer`);
    }
    return value;
}

export function assertSettingId(value: string): string {
    if (!/^[a-z0-9-]{1,64}$/.test(value)) {
        throw new NpmError('setting_id must match [a-z0-9-]{1,64}');
    }
    return value;
}

/**
 * Minimal client for the Nginx Proxy Manager REST API.
 * NPM only supports user tokens, so the client logs in with email/password and caches the token until shortly before it expires.
 */
export class NpmClient {
    private readonly fetchFn: typeof fetch;
    private readonly now: () => number;
    private readonly options: NpmClientOptions;
    private pendingLogin: Promise<string> | undefined;
    private token: string | undefined;
    private tokenExpiresAt = 0;

    constructor(options: NpmClientOptions) {
        this.options = options;
        this.fetchFn = options.fetch ?? fetch;
        this.now     = options.now ?? Date.now;
    }

    delete<T = unknown>(path: string): Promise<T> {
        return this.request<T>('DELETE', path);
    }

    get<T = unknown>(path: string, query?: Query): Promise<T> {
        return this.request<T>('GET', path, {query});
    }

    private async getToken(): Promise<string> {
        if (this.token && this.now() < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
            return this.token;
        }

        // Concurrent tool calls share one login request.
        this.pendingLogin ??= this.login().finally(() => {
            this.pendingLogin = undefined;
        });
        return this.pendingLogin;
    }

    invalidateToken(): void {
        this.token          = undefined;
        this.tokenExpiresAt = 0;
    }

    private async login(): Promise<string> {
        let response: Response;
        try {
            response = await this.fetchFn(`${this.options.url}/api/tokens`, {
                method:   'POST',
                headers:  {'Content-Type': 'application/json', Accept: 'application/json'},
                body:     JSON.stringify({identity: this.options.email, secret: this.options.password}),
                redirect: 'manual',
                signal:   AbortSignal.timeout(this.options.timeoutMs),
            });
        }
        catch (error) {
            throw this.networkError(error);
        }

        if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new NpmError('Authentication against Nginx Proxy Manager failed: check NPM_EMAIL and NPM_PASSWORD', response.status);
        }
        if (!response.ok) {
            throw new NpmError(`Login to Nginx Proxy Manager failed with HTTP ${response.status}`, response.status);
        }

        const data = await response.json() as TokenResponse;
        if (data.requireTwoFactor || !data.token) {
            throw new NpmError('The NPM user requires two-factor authentication, which this server does not support. Use a dedicated user without 2FA.');
        }

        const expires       = data.expires ? Date.parse(data.expires) : Number.NaN;
        this.token          = data.token;
        this.tokenExpiresAt = Number.isNaN(expires) ? this.now() + DEFAULT_TOKEN_LIFETIME_MS : expires;
        return data.token;
    }

    private networkError(error: unknown): NpmError {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
            return new NpmError(`Request to Nginx Proxy Manager timed out after ${this.options.timeoutMs} ms`);
        }
        return new NpmError(`Cannot reach Nginx Proxy Manager at ${this.options.url}: ${(error as Error).message}`);
    }

    private async parse<T>(method: string, path: string, response: Response): Promise<T> {
        const text        = await response.text();
        let data: unknown = undefined;
        if (text.length > 0) {
            try {
                data = JSON.parse(text);
            }
            catch {
                data = text;
            }
        }

        if (!response.ok) {
            const message = (data as { error?: { message?: string } } | undefined)?.error?.message;
            throw new NpmError(
                `NPM API ${method} ${path} failed with HTTP ${response.status}${message ? `: ${message}` : ''}`,
                response.status,
            );
        }

        return data as T;
    }

    post<T = unknown>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('POST', path, {body});
    }

    put<T = unknown>(path: string, body: unknown): Promise<T> {
        return this.request<T>('PUT', path, {body});
    }

    async request<T = unknown>(method: string, path: string, options: RequestOptions = {}, retryAuth = true): Promise<T> {
        const token    = await this.getToken();
        const response = await this.send(method, path, options, token);

        if (response.status === 401 && retryAuth) {
            this.invalidateToken();
            return this.request<T>(method, path, options, false);
        }

        return this.parse<T>(method, path, response);
    }

    private async send(method: string, path: string, options: RequestOptions, token: string): Promise<Response> {
        const url = new URL(`${this.options.url}/api${path}`);
        for (const [key, value] of Object.entries(options.query ?? {})) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }

        const headers: Record<string, string> = {Accept: 'application/json', Authorization: `Bearer ${token}`};
        let body: string | undefined;
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body                    = JSON.stringify(options.body);
        }

        try {
            return await this.fetchFn(url, {
                method,
                headers,
                body,
                redirect: 'manual',
                signal:   AbortSignal.timeout(this.options.timeoutMs),
            });
        }
        catch (error) {
            throw this.networkError(error);
        }
    }
}
