import assert from 'node:assert/strict';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {after, before, describe, it} from 'node:test';
import {loadConfig} from '../src/config.ts';
import {createHttpServer, isAuthorized} from '../src/http.ts';
import {NpmClient} from '../src/npm-client.ts';
import {type FakeNpm, startFakeNpm} from './fake-npm.ts';

const headers = {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: 'Bearer mcp-token'};

describe('http transport', () => {
    let npm: FakeNpm;
    let server: Server;
    let baseUrl: string;

    const rpc = async (method: string, params: unknown = {}) => {
        const response = await fetch(`${baseUrl}/mcp`, {method: 'POST', headers, body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})});
        assert.equal(response.status, 200);
        return (await response.json() as { result: any }).result;
    };

    before(async () => {
        npm          = await startFakeNpm();
        const config = loadConfig({NPM_URL: npm.url, NPM_EMAIL: 'claude@example.com', NPM_PASSWORD: 'secret', MCP_AUTH_TOKEN: 'mcp-token'});
        server       = createHttpServer(config, new NpmClient(config.npm));
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    after(async () => {
        server.close();
        await npm.close();
    });

    it('answers the health check without auth', async () => {
        const response = await fetch(`${baseUrl}/healthz`);
        assert.equal(response.status, 200);
    });

    it('rejects requests without a valid bearer token', async () => {
        const response = await fetch(`${baseUrl}/mcp`, {method: 'POST', headers: {...headers, Authorization: 'Bearer nope'}, body: '{}'});
        assert.equal(response.status, 401);
    });

    it('initializes and lists only read-only tools', async () => {
        const init = await rpc('initialize', {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'test', version: '1.0.0'}});
        assert.equal(init.serverInfo.name, 'nginx-proxy-manager-mcp');

        const list  = await rpc('tools/list');
        const names = list.tools.map((entry: { name: string }) => entry.name);
        assert.equal(names.length, 20);
        assert.ok(!names.includes('delete_proxy_host'));
        const listHosts = list.tools.find((entry: { name: string }) => entry.name === 'list_proxy_hosts');
        assert.equal(listHosts.annotations.readOnlyHint, true);
    });

    it('calls NPM through a tool', async () => {
        const result = await rpc('tools/call', {name: 'list_proxy_hosts', arguments: {}});
        assert.equal(result.isError, undefined);
        assert.deepEqual(JSON.parse(result.content[0].text), [{id: 1, domain_names: ['app.example.com'], forward_host: '10.0.0.1', forward_port: 8080}]);
    });

    it('returns NPM errors as tool errors', async () => {
        const result = await rpc('tools/call', {name: 'get_stream', arguments: {stream_id: 42}});
        assert.equal(result.isError, true);
        assert.match(result.content[0].text, /HTTP 404/);
    });

    it('compares tokens safely', () => {
        assert.equal(isAuthorized(undefined, undefined), true);
        assert.equal(isAuthorized('Bearer secret', 'secret'), true);
        assert.equal(isAuthorized('Bearer wrong!', 'secret'), false);
    });
});
