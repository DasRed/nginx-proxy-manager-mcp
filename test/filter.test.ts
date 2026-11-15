import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {isToolEnabled, matchesAny} from '../src/filter.ts';

const readTool  = {name: 'list_proxy_hosts', readOnly: true};
const writeTool = {name: 'delete_proxy_host', readOnly: false};

describe('filter', () => {
    it('matches wildcards', () => {
        assert.equal(matchesAny('list_proxy_hosts', ['list_*']), true);
        assert.equal(matchesAny('get_proxy_host', ['list_*']), false);
        assert.equal(matchesAny('get_host_report', ['*report']), true);
    });

    it('drops write tools in read-only mode', () => {
        const options = {readOnly: true, allow: [], deny: []};
        assert.equal(isToolEnabled(readTool, options), true);
        assert.equal(isToolEnabled(writeTool, options), false);
    });

    it('keeps write tools when read-only is off', () => {
        assert.equal(isToolEnabled(writeTool, {readOnly: false, allow: [], deny: []}), true);
    });

    it('applies allow and deny lists', () => {
        assert.equal(isToolEnabled(readTool, {readOnly: true, allow: ['get_*'], deny: []}), false);
        assert.equal(isToolEnabled(readTool, {readOnly: true, allow: [], deny: ['list_proxy_hosts']}), false);
        assert.equal(isToolEnabled(readTool, {readOnly: true, allow: ['list_*'], deny: ['*_hosts']}), false);
    });
});
