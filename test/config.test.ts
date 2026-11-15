import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {loadConfig, parseBoolean} from '../src/config.ts';

const base = {NPM_URL: 'http://npm:81', NPM_EMAIL: 'claude@example.com', NPM_PASSWORD: 'secret'};

describe('config', () => {
    it('requires the NPM connection', () => {
        assert.throws(() => loadConfig({}), /NPM_URL/);
        assert.throws(() => loadConfig({NPM_URL: 'http://npm:81'}), /NPM_EMAIL/);
        assert.throws(() => loadConfig({NPM_URL: 'http://npm:81', NPM_EMAIL: 'a@b.c'}), /NPM_PASSWORD/);
        assert.throws(() => loadConfig({...base, NPM_URL: 'ftp://npm'}), /http or https/);
    });

    it('uses safe defaults', () => {
        const config = loadConfig(base);
        assert.equal(config.host, '0.0.0.0');
        assert.equal(config.port, 3000);
        assert.equal(config.path, '/mcp');
        assert.equal(config.readOnly, true);
        assert.equal(config.authToken, undefined);
        assert.deepEqual(config.npm, {url: 'http://npm:81', email: 'claude@example.com', password: 'secret', timeoutMs: 30000});
    });

    it('normalizes the NPM URL', () => {
        assert.equal(loadConfig({...base, NPM_URL: 'https://npm.example.com/api/'}).npm.url, 'https://npm.example.com');
        assert.equal(loadConfig({...base, NPM_URL: 'http://npm:81/'}).npm.url, 'http://npm:81');
    });

    it('parses all settings', () => {
        const config = loadConfig({
            ...base,
            HOST:            '127.0.0.1',
            PORT:            '8080',
            MCP_PATH:        'npm',
            MCP_READ_ONLY:   'false',
            MCP_TOOLS_ALLOW: 'list_*',
            MCP_TOOLS_DENY:  'list_users',
            MCP_AUTH_TOKEN:  'token',
            NPM_TIMEOUT_MS:  '5000',
        });
        assert.equal(config.host, '127.0.0.1');
        assert.equal(config.port, 8080);
        assert.equal(config.path, '/npm');
        assert.equal(config.readOnly, false);
        assert.deepEqual(config.toolsAllow, ['list_*']);
        assert.deepEqual(config.toolsDeny, ['list_users']);
        assert.equal(config.authToken, 'token');
        assert.equal(config.npm.timeoutMs, 5000);
    });

    it('rejects invalid values', () => {
        assert.throws(() => parseBoolean('maybe', true), /Invalid boolean/);
        assert.throws(() => loadConfig({...base, PORT: '0'}), /Invalid PORT/);
        assert.throws(() => loadConfig({...base, NPM_TIMEOUT_MS: 'abc'}), /Invalid NPM_TIMEOUT_MS/);
    });
});
