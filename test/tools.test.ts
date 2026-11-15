import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';
import {loadConfig} from '../src/config.ts';
import {NpmClient} from '../src/npm-client.ts';
import {selectTools} from '../src/server.ts';
import {TOOLS} from '../src/tools.ts';
import {type FakeNpm, startFakeNpm} from './fake-npm.ts';

const env = {NPM_URL: 'http://npm:81', NPM_EMAIL: 'claude@example.com', NPM_PASSWORD: 'secret'};

function tool(name: string) {
    const found = TOOLS.find((entry) => entry.name === name);
    assert.ok(found, `tool ${name} missing`);
    return found;
}

describe('tool catalogue', () => {
    it('covers the 50 tools of the original server', () => {
        assert.equal(TOOLS.length, 50);
        assert.equal(new Set(TOOLS.map((entry) => entry.name)).size, 50);
    });

    it('exposes only read-only tools by default', () => {
        const names = selectTools(loadConfig(env)).map((entry) => entry.name);
        assert.equal(names.length, 20);
        assert.ok(names.includes('list_proxy_hosts'));
        assert.ok(names.includes('list_certificates'));
        assert.ok(names.includes('test_http_challenge'));
        assert.ok(!names.some((name) => /^(create|update|delete|enable|disable|renew|request)_/.test(name)));
    });

    it('exposes all tools when read-only is disabled', () => {
        assert.equal(selectTools(loadConfig({...env, MCP_READ_ONLY: 'false'})).length, 50);
    });

    it('applies allow and deny lists', () => {
        const names = selectTools(loadConfig({...env, MCP_TOOLS_ALLOW: 'list_*', MCP_TOOLS_DENY: 'list_users'})).map((entry) => entry.name);
        assert.ok(names.every((name) => name.startsWith('list_')));
        assert.ok(!names.includes('list_users'));
    });
});

describe('tool behaviour', () => {
    let npm: FakeNpm;
    let client: NpmClient;

    before(async () => {
        npm    = await startFakeNpm();
        client = new NpmClient({url: npm.url, email: 'claude@example.com', password: 'secret', timeoutMs: 5000});
    });

    after(() => npm.close());

    it('passes expand as comma separated list', async () => {
        await tool('list_proxy_hosts').run(client, {expand: ['certificate', 'access_list']});
        assert.deepEqual(npm.requests.at(-1)?.query, {expand: 'certificate,access_list'});
    });

    it('updates only the given fields', async () => {
        const result  = await tool('update_proxy_host').run(client, {host_id: 1, forward_port: 9090, ssl_forced: true});
        const request = npm.requests.at(-1);
        assert.equal(request?.method, 'PUT');
        assert.equal(request?.path, '/api/nginx/proxy-hosts/1');
        assert.deepEqual(request?.body, {forward_port: 9090, ssl_forced: true});
        assert.deepEqual(result, {id: 1, forward_port: 9090, ssl_forced: true});
    });

    it('refuses empty updates', async () => {
        await assert.rejects(tool('update_proxy_host').run(client, {host_id: 1}), /No fields to update/);
    });

    it('rejects invalid IDs before calling NPM', async () => {
        const before = npm.requests.length;
        await assert.rejects(tool('delete_proxy_host').run(client, {host_id: 0}), /positive integer/);
        await assert.rejects(tool('get_setting').run(client, {setting_id: '../users'}), /setting_id must match/);
        assert.equal(npm.requests.length, before);
    });

    it('adds defaults when creating a proxy host', async () => {
        await tool('create_proxy_host').run(client, {domain_names: ['a.example.com'], forward_host: '10.0.0.2', forward_port: 80}).catch(() => undefined);
        assert.deepEqual(npm.requests.at(-1)?.body, {forward_scheme: 'http', domain_names: ['a.example.com'], forward_host: '10.0.0.2', forward_port: 80});
    });

    it('builds the Let\'s Encrypt request', async () => {
        await tool('request_certificate').run(client, {domain_names: ['a.example.com'], dns_challenge: true, dns_provider: 'hetzner'}).catch(() => undefined);
        assert.deepEqual(npm.requests.at(-1)?.body, {
            provider:     'letsencrypt',
            domain_names: ['a.example.com'],
            meta:         {dns_challenge: true, dns_provider: 'hetzner'},
        });
    });

    it('returns a confirmation for deletes', async () => {
        assert.deepEqual(await tool('delete_proxy_host').run(client, {host_id: 1}), {success: true, message: 'proxy host deleted'});
    });
});
