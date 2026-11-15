import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {timingSafeEqual} from 'node:crypto';
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {Config} from './config.ts';
import type {NpmClient} from './npm-client.ts';
import {createMcpServer} from './server.ts';

const MAX_BODY_BYTES = 4 * 1024 * 1024;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    if (res.headersSent) {
        return;
    }
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(body));
}

function jsonRpcError(res: ServerResponse, status: number, message: string): void {
    sendJson(res, status, {jsonrpc: '2.0', error: {code: -32000, message}, id: null});
}

export function isAuthorized(header: string | undefined, token: string | undefined): boolean {
    if (!token) {
        return true;
    }
    const expected = Buffer.from(`Bearer ${token}`);
    const actual   = Buffer.from(header ?? '');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size               = 0;
    for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY_BYTES) {
            throw new Error('Request body too large');
        }
        chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw.length > 0 ? JSON.parse(raw) : undefined;
}

async function handleMcp(req: IncomingMessage, res: ServerResponse, config: Config, client: NpmClient): Promise<void> {
    if (req.method !== 'POST') {
        // Stateless mode: no server-initiated streams and no sessions to delete.
        res.setHeader('Allow', 'POST');
        jsonRpcError(res, 405, 'Method not allowed');
        return;
    }

    let body: unknown;
    try {
        body = await readBody(req);
    }
    catch (error) {
        jsonRpcError(res, 400, `Invalid request body: ${(error as Error).message}`);
        return;
    }

    const server    = createMcpServer(config, client);
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    res.on('close', () => {
        void transport.close();
        void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
}

export function createHttpServer(config: Config, client: NpmClient): Server {
    return createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (url.pathname === '/healthz') {
            sendJson(res, 200, {status: 'ok'});
            return;
        }

        if (url.pathname !== config.path) {
            sendJson(res, 404, {error: 'Not found'});
            return;
        }

        if (!isAuthorized(req.headers.authorization, config.authToken)) {
            res.setHeader('WWW-Authenticate', 'Bearer');
            jsonRpcError(res, 401, 'Unauthorized');
            return;
        }

        handleMcp(req, res, config, client).catch((error: unknown) => {
            console.error('MCP request failed:', error);
            jsonRpcError(res, 500, 'Internal server error');
        });
    });
}
