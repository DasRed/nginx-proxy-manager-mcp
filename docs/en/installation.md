---
title: Installation
description: Run nginx-proxy-manager-mcp as a Docker container next to Nginx Proxy Manager.
order: 10
slug: installation
section: Setup
---

## Image

The image is published to the GitHub Container Registry for `linux/amd64` and `linux/arm64`:

```text
ghcr.io/dasred/nginx-proxy-manager-mcp
```

Available tags: `latest`, `<major>` (e.g. `1`), `<major>.<minor>` and the full version. For long-running setups use the major tag.

## Requirements

- A running Nginx Proxy Manager. The MCP server talks to the admin API on port `81`.
- A dedicated NPM user without two-factor login (see [Configuration](configuration.md#create-an-npm-user)).

## Quick start

```sh
docker run -d --name mcp-nginx-proxy-manager \
  -p 3000:3000 \
  -e NPM_URL=http://nginx-proxy-manager:81 \
  -e NPM_EMAIL=claude@example.com \
  -e NPM_PASSWORD=your-password \
  ghcr.io/dasred/nginx-proxy-manager-mcp:1
```

Check that the server is running:

```sh
curl http://localhost:3000/healthz
```

Response: `{"status":"ok"}`. The health check only covers the MCP server itself, not the connection to NPM.

## Docker Compose

The easiest setup is to run the container in the same Docker network as NPM. It then reaches the admin API by container name, and port `81` does not need to be exposed.

```yaml
services:
  mcp-nginx-proxy-manager:
    image: ghcr.io/dasred/nginx-proxy-manager-mcp:1
    restart: unless-stopped
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    environment:
      NPM_URL: http://nginx-proxy-manager:81
      NPM_EMAIL: ${NPM_EMAIL}
      NPM_PASSWORD: ${NPM_PASSWORD}
      MCP_READ_ONLY: 'true'
    networks:
      - proxy

networks:
  proxy:
    external: true
```

Put email and password into a `.env` file next to `compose.yaml`, not into the file itself.

> [!TIP]
> The server stores nothing on disk. The NPM token is only kept in memory. That is why `read_only: true` and `cap_drop: ALL` work without any volumes.

## Ports and endpoints

| Path       | Method | Description                                     |
|------------|--------|-------------------------------------------------|
| `/mcp`     | `POST` | MCP endpoint (path configurable via `MCP_PATH`) |
| `/healthz` | `GET`  | Health check, no authentication                 |

The container listens on port `3000`. Methods other than `POST` on `/mcp` return `405` because the server is stateless.

## Publish it through NPM itself

For Claude to reach the server, it needs an HTTPS address. Usually you create a proxy host in NPM itself, e.g. `npm.mcp.example.com` → `mcp-nginx-proxy-manager:3000`.

> [!WARNING]
> Chicken-and-egg: if NPM goes down, the MCP server is unreachable too. You still need a way to fix NPM without Claude.

How to restrict access is described in [Security](security.md).
