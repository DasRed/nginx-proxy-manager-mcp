---
title: Other MCP clients
description: Add nginx-proxy-manager-mcp to other MCP clients via JSON configuration, directly over HTTP or through mcp-remote for clients that only support stdio.
order: 35
slug: other-clients
section: Setup
---

Many MCP clients are configured with a JSON entry under `mcpServers`, e.g. the `.mcp.json` of Claude Code or clients with their own web UI. There are two variants for nginx-proxy-manager-mcp.

## Entry over HTTP

For clients that support remote servers over HTTP:

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "type": "http",
      "url": "https://npm.mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-mcp-auth-token"
      }
    }
  }
}
```

- Depending on the client, `type` is `http` or `streamable-http`.
- Leave out `headers` if `MCP_AUTH_TOKEN` is not set on the server.
- These clients connect from your machine, so an address in your home network is enough, e.g. `http://192.168.1.10:3000/mcp`.

## Clients with stdio only (mcp-remote)

Clients that only start local servers via stdio (e.g. the `claude_desktop_config.json` of Claude Desktop) connect through [mcp-remote](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://npm.mcp.example.com/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer your-mcp-auth-token"
      }
    }
  }
}
```

The token goes into `env` because some clients do not pass spaces in `args` correctly. For an `http://` address other than `localhost`, mcp-remote also needs `--allow-http`.

## Test

Testing and troubleshooting work as described in [Connect to Claude](claude.md). After changing the tool set, reload the configuration or restart the client so it loads the new tool list.
