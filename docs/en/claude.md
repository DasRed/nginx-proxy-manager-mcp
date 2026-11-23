---
title: Connect to Claude
description: Connect nginx-proxy-manager-mcp to Claude as a custom connector, in Claude Code or via JSON config in other MCP clients, then test it and fix common problems.
order: 30
slug: claude
section: Setup
---

## Requirements

- nginx-proxy-manager-mcp is running and reachable from the internet via HTTPS, e.g. at `https://npm.mcp.example.com/mcp`.
- Access is restricted (see [Security](security.md)).

> [!IMPORTANT]
> Custom connectors in Claude connect from Anthropic's servers, not from your machine. A URL that only works in your home network is not enough.

## Claude (web, desktop, mobile)

1. **Settings** → **Connectors** → **Add custom connector**.
2. Name: e.g. `Nginx Proxy Manager`.
3. URL: `https://npm.mcp.example.com/mcp`
4. Save.

Claude connectors cannot send custom headers, so no bearer token either. Restrict the endpoint at the reverse proxy instead, e.g. with an NPM access list containing [Anthropic's outbound IP addresses](https://docs.claude.com/en/api/ip-addresses).

With write mode enabled, you can set per tool in Claude's connector settings whether Claude has to ask first. That makes sense for `delete_*`, `disable_*` and `update_*`.

## Claude Code

In Claude Code you can pass the bearer token directly:

```sh
claude mcp add --transport http nginx-proxy-manager https://npm.mcp.example.com/mcp \
  --header "Authorization: Bearer your-mcp-auth-token"
```

This requires `MCP_AUTH_TOKEN` to be set on the server.

## Other MCP clients (JSON configuration)

Many MCP clients are configured with a JSON entry under `mcpServers`, e.g. the `.mcp.json` of Claude Code or clients with their own web UI. For nginx-proxy-manager-mcp the entry looks like this:

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

Ask Claude for example:

- "Which proxy hosts exist in Nginx Proxy Manager?"
- "Which certificates expire in the next 30 days?"
- "Which hosts use the access list 'Internal'?"

Claude should call `list_proxy_hosts`, `list_certificates` or `list_access_lists` for that.

## Troubleshooting

| Symptom                     | Cause                                                                        |
|-----------------------------|------------------------------------------------------------------------------|
| Connector does not connect  | Server not publicly reachable, or the access list blocks Anthropic's IPs.    |
| `401 Unauthorized`          | `MCP_AUTH_TOKEN` is set but the client sends no or a wrong token.            |
| `405 Method not allowed`    | Expected for `GET`. The server is stateless and only accepts `POST`.         |
| Tools are missing           | `MCP_READ_ONLY` or the allow/deny lists filter them out.                     |
| Tool reports a login error  | `NPM_EMAIL`/`NPM_PASSWORD` wrong, or 2FA is enabled for the user.            |
| Tool reports `403`          | The NPM user lacks permissions (e.g. **View Only** instead of **Manage**).   |

After changing the tool set, disconnect and reconnect the connector in Claude once so it loads the new tool list.
