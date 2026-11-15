# nginx-proxy-manager-mcp

Streamable HTTP [MCP](https://modelcontextprotocol.io) server for the [Nginx Proxy Manager](https://nginxproxymanager.com) API, written in Node.js/TypeScript and shipped as a Docker image.

The tool set is a port of [VeryBigSad/nginx-proxy-manager-mcp](https://github.com/VeryBigSad/nginx-proxy-manager-mcp) (Python, stdio, MIT). This implementation does not use any of its code and adds:

- **Streamable HTTP transport**, usable as a remote MCP server / custom connector.
- **Read-only by default**: only the 20 read tools are exposed unless `MCP_READ_ONLY=false`.
- **Partial updates**: `update_*` tools only send the given fields (`PUT` in NPM is a patch), so nothing else is overwritten.
- **Token handling**: logs in once, caches the token until shortly before it expires and logs in again on `401`.
- **Allow/deny lists** for single tools with `*` wildcards.
- **Optional bearer token** for the MCP endpoint and a **health check** at `/healthz`.

## Tools

| Area | Read | Write |
|------|------|-------|
| Proxy hosts | `list_proxy_hosts`, `get_proxy_host` | `create_proxy_host`, `update_proxy_host`, `delete_proxy_host`, `enable_proxy_host`, `disable_proxy_host` |
| Redirection hosts | `list_redirection_hosts`, `get_redirection_host` | `create_…`, `update_…`, `delete_…`, `enable_…`, `disable_redirection_host` |
| Streams | `list_streams`, `get_stream` | `create_stream`, `update_stream`, `delete_stream`, `enable_stream`, `disable_stream` |
| 404 hosts | `list_dead_hosts`, `get_dead_host` | `create_…`, `update_…`, `delete_…`, `enable_…`, `disable_dead_host` |
| Certificates | `list_certificates`, `get_certificate`, `list_dns_providers`, `test_http_challenge` | `request_certificate`, `renew_certificate`, `delete_certificate` |
| Access lists | `list_access_lists`, `get_access_list` | `create_access_list`, `update_access_list`, `delete_access_list` |
| Users | `list_users`, `get_user` | `create_user`, `update_user`, `delete_user` |
| Settings | `list_settings`, `get_setting` | `update_setting` |
| Reports | `list_audit_log`, `get_host_report` | – |

List and get tools accept an optional `expand` array (e.g. `["certificate", "access_list"]`).

## Configuration

All settings are environment variables (see [`.env.example`](.env.example)).

| Variable          | Default   | Description                                                                             |
|-------------------|-----------|-----------------------------------------------------------------------------------------|
| `NPM_URL`         | –         | Admin URL of Nginx Proxy Manager, e.g. `http://nginx-proxy-manager:81`.                 |
| `NPM_EMAIL`       | –         | Email of the NPM user used by the MCP server.                                           |
| `NPM_PASSWORD`    | –         | Password of that user. Users with two-factor authentication are not supported.          |
| `NPM_TIMEOUT_MS`  | `30000`   | Request timeout against NPM.                                                            |
| `HOST`            | `0.0.0.0` | Listen address.                                                                         |
| `PORT`            | `3000`    | Listen port.                                                                            |
| `MCP_PATH`        | `/mcp`    | Path of the MCP endpoint.                                                               |
| `MCP_READ_ONLY`   | `true`    | Expose only read-only tools.                                                            |
| `MCP_TOOLS_ALLOW` | –         | Comma separated tool names to keep, `*` as wildcard (e.g. `list_*,get_*`).              |
| `MCP_TOOLS_DENY`  | –         | Comma separated tool names to remove, `*` as wildcard (e.g. `*_user*`).                 |
| `MCP_AUTH_TOKEN`  | –         | If set, the MCP endpoint requires `Authorization: Bearer <token>`.                      |

Filters are applied in this order: read-only mode, allow list, deny list.

### Recommended NPM user

NPM has no API keys, only user logins. Create a dedicated user for the MCP server instead of using your admin account:

1. NPM → Users → Add User (not an administrator).
2. Permissions: **View Only** for every section when running in read-only mode.
3. Do not enable two-factor authentication for this user.

## Docker

```sh
docker run -d --name mcp-nginx-proxy-manager \
  -p 3000:3000 \
  -e NPM_URL=http://nginx-proxy-manager:81 \
  -e NPM_EMAIL=claude@example.com \
  -e NPM_PASSWORD=your-password \
  ghcr.io/dasred/nginx-proxy-manager-mcp:latest
```

Example `docker-compose.yml` next to NPM:

```yaml
services:
  mcp-nginx-proxy-manager:
    image: ghcr.io/dasred/nginx-proxy-manager-mcp:latest
    restart: unless-stopped
    environment:
      NPM_URL: http://nginx-proxy-manager:81
      NPM_EMAIL: ${NPM_EMAIL}
      NPM_PASSWORD: ${NPM_PASSWORD}
    ports:
      - "3000:3000"
```

The MCP endpoint is `http://<host>:3000/mcp`. When exposing it to the internet, put it behind a reverse proxy with TLS and authentication (or set `MCP_AUTH_TOKEN`). Whoever controls this endpoint with write tools enabled controls your reverse proxy.

## Development

Requires Node.js 26.

```sh
npm ci
cp .env.example .env   # set NPM_URL, NPM_EMAIL, NPM_PASSWORD
npm run dev            # runs src/index.ts in watch mode
npm test               # type check + node:test (uses a fake NPM API)
npm run build          # compiles to dist/
```

## Release

Releases are created by [semantic-release](https://github.com/semantic-release/semantic-release) on every push to `main` based on [Conventional Commits](https://www.conventionalcommits.org). The CI pipeline (`DasRed/github-workflows` → `node-docker.yml`) runs tests and build, creates the release, publishes the multi-arch image (`linux/amd64`, `linux/arm64`) to `ghcr.io/dasred/nginx-proxy-manager-mcp` and updates the container via Dockhand.

## License

MIT
