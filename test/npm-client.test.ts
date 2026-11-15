import assert from 'node:assert/strict';
import {after, before, beforeEach, describe, it} from 'node:test';
import {NpmClient, NpmError} from '../src/npm-client.ts';
import {type FakeNpm, startFakeNpm} from './fake-npm.ts';

describe('npm client', () => {
    let npm: FakeNpm;
    let client: NpmClient;

    before(async () => {
        npm = await startFakeNpm();
    });

    after(() => npm.close());

    beforeEach(() => {
        client = new NpmClient({url: npm.url, email: 'claude@example.com', password: 'secret', timeoutMs: 5000});
    });

    it('logs in once and reuses the token', async () => {
        const loginsBefore = npm.logins;
        await client.get('/nginx/proxy-hosts');
        await client.get('/reports/hosts');
        assert.equal(npm.logins - loginsBefore, 1);
        assert.match(npm.requests.at(-1)?.authorization ?? '', /^Bearer token-\d+$/);
    });

    it('shares one login between concurrent requests', async () => {
        const loginsBefore = npm.logins;
        await Promise.all([client.get('/nginx/proxy-hosts'), client.get('/reports/hosts'), client.get('/reports/hosts')]);
        assert.equal(npm.logins - loginsBefore, 1);
    });

    it('logs in again when the token was rejected', async () => {
        await client.get('/reports/hosts');
        npm.validTokens.clear();
        const loginsBefore = npm.logins;
        const report       = await client.get('/reports/hosts');
        assert.deepEqual(report, {proxy: 1, redirection: 0, stream: 0, dead: 0});
        assert.equal(npm.logins - loginsBefore, 1);
    });

    it('refreshes the token shortly before it expires', async () => {
        let now = Date.now();
        client  = new NpmClient({url: npm.url, email: 'claude@example.com', password: 'secret', timeoutMs: 5000, now: () => now});
        await client.get('/reports/hosts');
        const loginsBefore = npm.logins;
        now += 86_400_000 - 30_000;
        await client.get('/reports/hosts');
        assert.equal(npm.logins - loginsBefore, 1);
    });

    it('sends query parameters and bodies', async () => {
        await client.get('/nginx/proxy-hosts', {expand: 'certificate,owner', skip: undefined});
        assert.deepEqual(npm.requests.at(-1)?.query, {expand: 'certificate,owner'});

        await client.put('/nginx/proxy-hosts/1', {forward_port: 9090});
        assert.deepEqual(npm.requests.at(-1)?.body, {forward_port: 9090});
    });

    it('reports wrong credentials clearly', async () => {
        client = new NpmClient({url: npm.url, email: 'claude@example.com', password: 'wrong', timeoutMs: 5000});
        await assert.rejects(client.get('/reports/hosts'), /check NPM_EMAIL and NPM_PASSWORD/);
    });

    it('includes the NPM error message', async () => {
        await assert.rejects(client.get('/nginx/streams/99'), (error: NpmError) => {
            assert.equal(error.status, 404);
            assert.match(error.message, /GET \/nginx\/streams\/99 failed with HTTP 404: Not Found/);
            return true;
        });
    });

    it('reports unreachable instances', async () => {
        client = new NpmClient({url: 'http://127.0.0.1:1', email: 'claude@example.com', password: 'secret', timeoutMs: 5000});
        await assert.rejects(client.get('/reports/hosts'), /Cannot reach Nginx Proxy Manager/);
    });
});
