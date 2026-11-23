---
title: Overview
description: nginx-proxy-manager-mcp exposes the Nginx Proxy Manager API as a remote MCP server for Claude. What it can do, what it is based on and its current status.
order: 0
section: Getting started
---

## What is nginx-proxy-manager-mcp?

nginx-proxy-manager-mcp is an [MCP](https://modelcontextprotocol.io) server for [Nginx Proxy Manager](https://nginxproxymanager.com) (NPM). It runs as a Docker container and speaks Streamable HTTP, so you can add it to Claude as a custom connector.

Claude can then read your proxy hosts, redirects, streams, 404 hosts, certificates and access lists and, if you allow it, create and change them.

## What for?

- **Overview**: which domain points to which container, with which certificate and access list?
- **Certificates**: which Let's Encrypt certificates expire soon?
- **Setup**: "Create `app.example.com` pointing to `10.0.0.5:8080`, with the wildcard certificate and forced HTTPS."
- **Auditing**: the audit log shows who changed what and when.

## Tools

There are 50 tools in nine areas: proxy hosts, redirection hosts, streams, 404 hosts, certificates, access lists, users, settings and reports. 20 of them are read-only.

By default only the read-only tools are active. See [Tools](tools.md) for the full list.

## Base

The tool set follows [VeryBigSad/nginx-proxy-manager-mcp](https://github.com/VeryBigSad/nginx-proxy-manager-mcp) (Python, stdio). The code is an independent Node.js/TypeScript implementation and adds:

- HTTP transport (stateless, every `POST` gets its own MCP instance)
- Read-only mode by default
- Partial updates: `update_*` only sends the fields you pass
- Login with token cache and automatic re-login on `401`
- Allow and deny lists with `*` as wildcard
- Optional bearer token for the MCP endpoint and health check at `/healthz`

## Status

Actively used. The image is built automatically to `ghcr.io/dasred/nginx-proxy-manager-mcp` on every release.

## Next

1. [Installation](installation.md)
2. [Configuration](configuration.md)
3. [Connect to Claude](claude.md)
