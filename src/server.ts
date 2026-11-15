import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {createRequire} from 'node:module';
import type {Config} from './config.ts';
import {isToolEnabled} from './filter.ts';
import type {NpmClient} from './npm-client.ts';
import {type ToolDefinition, TOOLS} from './tools.ts';

const require = createRequire(import.meta.url);
const pkg     = require('../package.json') as { name: string; version: string };

export function selectTools(config: Pick<Config, 'readOnly' | 'toolsAllow' | 'toolsDeny'>): ToolDefinition[] {
    return TOOLS.filter((tool) => isToolEnabled(
        {name: tool.name, readOnly: tool.readOnly},
        {readOnly: config.readOnly, allow: config.toolsAllow, deny: config.toolsDeny},
    ));
}

function toResult(data: unknown): CallToolResult {
    const text = data === undefined ? '{"success":true}' : JSON.stringify(data, null, 2);
    return {content: [{type: 'text', text}]};
}

export function createMcpServer(config: Config, client: NpmClient): McpServer {
    const server = new McpServer({name: 'nginx-proxy-manager-mcp', version: pkg.version});

    for (const tool of selectTools(config)) {
        server.registerTool(
            tool.name,
            {
                title:       tool.title,
                description: tool.description,
                inputSchema: tool.inputSchema,
                annotations: {
                    title:           tool.title,
                    readOnlyHint:    tool.readOnly,
                    destructiveHint: tool.destructive,
                    openWorldHint:   false,
                },
            },
            async (args: Record<string, unknown>): Promise<CallToolResult> => {
                try {
                    return toResult(await tool.run(client, args));
                }
                catch (error) {
                    return {isError: true, content: [{type: 'text', text: `Error: ${(error as Error).message}`}]};
                }
            },
        );
    }

    return server;
}

export const packageInfo = pkg;
