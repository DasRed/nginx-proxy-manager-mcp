# nginx-proxy-manager-mcp

Streamable HTTP [MCP](https://modelcontextprotocol.io) server for the [Nginx Proxy Manager](https://nginxproxymanager.com) API, shipped as a Docker image. It lets Claude read and – if enabled – manage proxy hosts, redirects, streams, 404 hosts, certificates and access lists. Read-only by default, with allow/deny lists, partial updates and an optional bearer token.

The tool set follows [VeryBigSad/nginx-proxy-manager-mcp](https://github.com/VeryBigSad/nginx-proxy-manager-mcp); this is an independent Node.js/TypeScript implementation.

Documentation: https://www.marco-starker.de/en/projects/nginx-proxy-manager-mcp/docs

## Quick start

```sh
docker run -d --name mcp-nginx-proxy-manager \
  -p 3000:3000 \
  -e NPM_URL=http://nginx-proxy-manager:81 \
  -e NPM_EMAIL=claude@example.com \
  -e NPM_PASSWORD=your-password \
  ghcr.io/dasred/nginx-proxy-manager-mcp:1
```

The MCP endpoint is `http://localhost:3000/mcp`. Never expose it to the internet without TLS and access control: whoever controls it with write tools enabled controls your reverse proxy.

## Development

Requires Node.js 26.

```sh
npm ci
cp .env.example .env
npm run dev
npm test
npm run build
```

Releases are created by semantic-release from Conventional Commits on `main`.

## License

MIT
