---
title: Configuration
description: All environment variables of nginx-proxy-manager-mcp with their defaults, plus how to create a dedicated NPM user and limit the available tools with filters.
order: 20
slug: configuration
section: Setup
---

## Environment variables

nginx-proxy-manager-mcp is configured entirely through environment variables. A template is in [`.env.example`](https://github.com/DasRed/nginx-proxy-manager-mcp/blob/main/.env.example).

| Name              | Default   | Description                                                                                         |
|-------------------|-----------|-----------------------------------------------------------------------------------------------------|
| `NPM_URL`         | –         | Required. Admin URL of NPM, e.g. `http://nginx-proxy-manager:81`. A trailing `/api` does not matter. |
| `NPM_EMAIL`       | –         | Required. Email of the NPM user the server logs in with.                                            |
| `NPM_PASSWORD`    | –         | Required. Password of that user.                                                                    |
| `NPM_TIMEOUT_MS`  | `30000`   | Timeout per request to NPM in milliseconds (1000 to 600000).                                        |
| `HOST`            | `0.0.0.0` | Listen address.                                                                                     |
| `PORT`            | `3000`    | Listen port.                                                                                        |
| `MCP_PATH`        | `/mcp`    | Path of the MCP endpoint.                                                                           |
| `MCP_READ_ONLY`   | `true`    | Expose only read-only tools. Accepts `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off`.              |
| `MCP_TOOLS_ALLOW` | –         | Comma separated tool names to keep. `*` is a wildcard.                                              |
| `MCP_TOOLS_DENY`  | –         | Comma separated tool names to remove. `*` is a wildcard.                                            |
| `MCP_AUTH_TOKEN`  | –         | If set, `/mcp` requires the header `Authorization: Bearer <token>`.                                 |

Missing required values or invalid values stop the server at startup with a clear error.

## Create an NPM user

NPM has no API keys, only user logins. Create a dedicated user for the MCP server instead of using your admin account.

1. In NPM: **Users** → **Add User**.
2. Set name and email, e.g. `claude@example.com`. **Not** an administrator.
3. Set the **Permissions**:
   - Read-only: **View Only** everywhere.
   - Write: **Manage** for the areas Claude may change.
4. Set a password and use it as `NPM_PASSWORD`.

> [!IMPORTANT]
> Two-factor login is not supported. If 2FA is enabled for the user, login fails.

Only administrators can change users and settings in NPM. So `create_user`, `update_user`, `delete_user` and `update_setting` do not work with a regular user. That is intended.

The server logs in once, caches the token until shortly before it expires and logs in again on `401`.

## Tool filters

Filters are applied in this order:

1. **`MCP_READ_ONLY`** drops all write tools.
2. **`MCP_TOOLS_ALLOW`** keeps only matching tools (if set).
3. **`MCP_TOOLS_DENY`** removes matching tools.

Examples:

```sh
# Only read proxy hosts and certificates
MCP_TOOLS_ALLOW=*_proxy_host*,*_certificate*

# Writing allowed, but no users and settings
MCP_READ_ONLY=false
MCP_TOOLS_DENY=*_user,*_users,update_setting

# Writing allowed, but no deletes
MCP_READ_ONLY=false
MCP_TOOLS_DENY=delete_*
```

See [Tools](tools.md) for all available tools.

## Example

```sh
NPM_URL=http://nginx-proxy-manager:81
NPM_EMAIL=claude@example.com
NPM_PASSWORD=your-password
MCP_READ_ONLY=false
MCP_TOOLS_DENY=*_user
```
