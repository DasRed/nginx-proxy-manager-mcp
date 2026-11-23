---
title: Security
description: Which permissions nginx-proxy-manager-mcp needs in Nginx Proxy Manager, when to turn on write mode and how to protect the endpoint and the credentials.
order: 50
slug: security
section: Reference
---

## Default: read-only

Without further settings the server only exposes the 20 read-only tools. Claude can read hosts, certificates, access lists, users, settings and the audit log, but cannot change anything.

Give the NPM user **View Only** everywhere. Then read-only mode is protected twice: even if a write tool slipped through, NPM rejects the call.

## Write mode

With `MCP_READ_ONLY=false` and **Manage** permissions, Claude can among other things:

- create, change, disable and delete proxy hosts, redirects, streams and 404 hosts
- request, renew and delete Let's Encrypt certificates
- change access lists, i.e. decide who may access which service

> [!CAUTION]
> Whoever controls this endpoint controls your reverse proxy. A wrong proxy host can expose services, a deleted access list protects nothing anymore. Narrow write mode down with `MCP_TOOLS_DENY` and let Claude ask before critical tools.

Tools carry MCP hints: `readOnlyHint` for read tools and `destructiveHint` for tools that overwrite or remove existing configuration (`update_*`, `delete_*`, `disable_*`). Claude uses them to ask before risky actions.

`update_*` only changes the fields that are sent. Exception: `locations` on proxy hosts and `items` and `clients` on access lists replace the existing entries completely.

## Credentials

- NPM only knows user logins. Use a dedicated user, never your admin.
- Not an administrator: then the server can change neither users nor settings, even if the tools are active.
- Email and password stay in the container. They are only sent to `NPM_URL`, never to Claude.
- The NPM token is only kept in memory and never logged.

## Protecting the endpoint

Anyone who can reach `/mcp` can call all active tools as the NPM user. Never leave the endpoint open on the internet.

| Option                          | Suitable for                  | How                                                          |
|---------------------------------|-------------------------------|--------------------------------------------------------------|
| Access list in NPM              | Claude (web, desktop, mobile) | Allow only [Anthropic's IPs](https://docs.claude.com/en/api/ip-addresses) and your own network. |
| Bearer token (`MCP_AUTH_TOKEN`) | Claude Code, own clients      | Set a long random value, e.g. `openssl rand -hex 32`.        |
| Internal only                   | Clients in the same network   | Publish no port, reachable only inside the Docker network.   |

The token comparison is constant-time. `/healthz` is intentionally unauthenticated and only returns `{"status":"ok"}`.

> [!TIP]
> The NPM admin UI (port `81`) does not need to be public for the MCP server. Inside the same Docker network the container name is enough.

## Container

- The server is stateless and writes nothing to disk. You can run it with `read_only: true`, `cap_drop: ALL` and `no-new-privileges`.
- Requests to `/mcp` are limited to 4 MB.
- Secrets belong in a `.env` file or a secret store, not in a `compose.yaml` committed to Git.
