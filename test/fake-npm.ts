import {createServer, type IncomingMessage, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';

export interface RecordedRequest {
    authorization: string | undefined;
    body: unknown;
    method: string;
    path: string;
    query: Record<string, string>;
}

export interface FakeNpm {
    logins: number;
    requests: RecordedRequest[];
    url: string;
    /** Tokens accepted by the fake API; clear it to simulate an expired token. */
    validTokens: Set<string>;

    close(): Promise<void>;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : undefined;
}

export async function startFakeNpm(): Promise<FakeNpm> {
    const state = {requests: [] as RecordedRequest[], logins: 0, validTokens: new Set<string>()};

    const server: Server = createServer(async (req, res) => {
        const url  = new URL(req.url ?? '/', 'http://localhost');
        const body = await readJson(req);
        const send = (status: number, data: unknown) => {
            res.writeHead(status, {'Content-Type': 'application/json'});
            res.end(data === undefined ? '' : JSON.stringify(data));
        };

        if (url.pathname === '/api/tokens' && req.method === 'POST') {
            const {identity, secret} = body as { identity: string; secret: string };
            if (identity !== 'claude@example.com' || secret !== 'secret') {
                send(401, {error: {code: 401, message: 'Invalid email or password'}});
                return;
            }
            state.logins++;
            const token = `token-${state.logins}`;
            state.validTokens.add(token);
            send(200, {token, expires: new Date(Date.now() + 86_400_000).toISOString()});
            return;
        }

        const authorization = req.headers.authorization;
        state.requests.push({
            method: req.method ?? 'GET',
            path:   url.pathname,
            query:  Object.fromEntries(url.searchParams),
            authorization,
            body,
        });

        if (!state.validTokens.has(authorization?.replace('Bearer ', '') ?? '')) {
            send(401, {error: {code: 401, message: 'Token has expired'}});
            return;
        }

        if (url.pathname === '/api/nginx/proxy-hosts' && req.method === 'GET') {
            send(200, [{id: 1, domain_names: ['app.example.com'], forward_host: '10.0.0.1', forward_port: 8080}]);
            return;
        }
        if (url.pathname === '/api/nginx/proxy-hosts/1' && req.method === 'PUT') {
            send(200, {id: 1, ...(body as object)});
            return;
        }
        if (url.pathname === '/api/nginx/proxy-hosts/1' && req.method === 'DELETE') {
            send(200, true);
            return;
        }
        if (url.pathname === '/api/reports/hosts') {
            send(200, {proxy: 1, redirection: 0, stream: 0, dead: 0});
            return;
        }

        send(404, {error: {code: 404, message: 'Not Found'}});
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const {port} = server.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${port}`,
        get requests() {
            return state.requests;
        },
        get logins() {
            return state.logins;
        },
        validTokens: state.validTokens,
        close:       () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
}
