---
title: Tools
description: Reference of all 50 nginx-proxy-manager-mcp tools with parameters, kind and examples.
order: 40
slug: tools
section: Reference
---

## Overview

nginx-proxy-manager-mcp ships 50 tools: 20 are read-only, 30 write, and 18 of those count as destructive because they overwrite or remove existing configuration.

In the default mode (`MCP_READ_ONLY=true`) only tools marked 📖 are active. See [Configuration](configuration.md) and [Security](security.md).

| Kind | Meaning | MCP hint |
|---|---|---|
| 📖 Read | Only reads, changes nothing | `readOnlyHint: true` |
| ✏️ Write | Creates or enables something | – |
| ⚠️ Destructive | Overwrites, disables or deletes | `destructiveHint: true` |

> [!NOTE]
> Optional parameters are marked with `?`. For `update_*` all fields except the ID are optional; only what you send is changed.

## Common parameters

| Name | Description |
|---|---|
| `expand` | List of related objects to include. Proxy hosts: `access_list`, `owner`, `certificate`. Redirects, streams, 404 hosts: `owner`, `certificate`. Certificates: `owner`. |
| `domain_names` | List of domains, e.g. `["app.example.com"]`, at most 100. |
| `certificate_id` | Certificate ID, `0` for none. |
| `access_list_id` | Access list ID, `0` for public. |
| `ssl_forced`, `hsts_enabled`, `hsts_subdomains`, `http2_support` | SSL switches as in the NPM UI. |
| `advanced_config` | Custom nginx configuration, at most 16 KB. |
| `locations` | Custom locations of a proxy host. Replaces all existing ones. |

## Proxy hosts

Forward domains to internal services.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_proxy_hosts` | 📖 Read | `expand?` | List all proxy hosts configured in Nginx Proxy Manager |
| `get_proxy_host` | 📖 Read | `host_id`, `expand?` | Get details of a proxy host by ID |
| `create_proxy_host` | ✏️ Write | `domain_names`, `forward_scheme?`, `forward_host`, `forward_port`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `caching_enabled?`, `allow_websocket_upgrade?`, `access_list_id?`, `advanced_config?`, `meta?`, `locations?` | Create a new proxy host |
| `update_proxy_host` | ⚠️ Destructive | `host_id`, `domain_names?`, `forward_scheme?`, `forward_host?`, `forward_port?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `caching_enabled?`, `allow_websocket_upgrade?`, `access_list_id?`, `advanced_config?`, `meta?`, `locations?` | Update an existing proxy host. Only the given fields are changed. |
| `delete_proxy_host` | ⚠️ Destructive | `host_id` | Delete a proxy host by ID |
| `enable_proxy_host` | ✏️ Write | `host_id` | Enable a proxy host |
| `disable_proxy_host` | ⚠️ Destructive | `host_id` | Disable a proxy host |

## Redirection hosts

HTTP redirects to other domains.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_redirection_hosts` | 📖 Read | `expand?` | List all redirection hosts configured in Nginx Proxy Manager |
| `get_redirection_host` | 📖 Read | `host_id`, `expand?` | Get details of a redirection host by ID |
| `create_redirection_host` | ✏️ Write | `domain_names`, `forward_scheme?`, `forward_http_code`, `forward_domain_name`, `preserve_path?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `advanced_config?`, `meta?` | Create a new redirection host |
| `update_redirection_host` | ⚠️ Destructive | `host_id`, `domain_names?`, `forward_scheme?`, `forward_http_code?`, `forward_domain_name?`, `preserve_path?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `advanced_config?`, `meta?` | Update an existing redirection host. Only the given fields are changed. |
| `delete_redirection_host` | ⚠️ Destructive | `host_id` | Delete a redirection host by ID |
| `enable_redirection_host` | ✏️ Write | `host_id` | Enable a redirection host |
| `disable_redirection_host` | ⚠️ Destructive | `host_id` | Disable a redirection host |

## Streams

TCP/UDP forwarding on port level.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_streams` | 📖 Read | `expand?` | List all TCP/UDP streams configured in Nginx Proxy Manager |
| `get_stream` | 📖 Read | `stream_id`, `expand?` | Get details of a TCP/UDP stream by ID |
| `create_stream` | ✏️ Write | `incoming_port`, `forwarding_host`, `forwarding_port`, `tcp_forwarding?`, `udp_forwarding?`, `certificate_id?`, `meta?` | Create a new TCP/UDP stream |
| `update_stream` | ⚠️ Destructive | `stream_id`, `incoming_port?`, `forwarding_host?`, `forwarding_port?`, `tcp_forwarding?`, `udp_forwarding?`, `certificate_id?`, `meta?` | Update an existing TCP/UDP stream. Only the given fields are changed. |
| `delete_stream` | ⚠️ Destructive | `stream_id` | Delete a TCP/UDP stream by ID |
| `enable_stream` | ✏️ Write | `stream_id` | Enable a TCP/UDP stream |
| `disable_stream` | ⚠️ Destructive | `stream_id` | Disable a TCP/UDP stream |

## 404 hosts

Domains that intentionally answer with 404.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_dead_hosts` | 📖 Read | `expand?` | List all 404 dead hosts configured in Nginx Proxy Manager |
| `get_dead_host` | 📖 Read | `host_id`, `expand?` | Get details of a 404 dead host by ID |
| `create_dead_host` | ✏️ Write | `domain_names`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `advanced_config?`, `meta?` | Create a new 404 dead host |
| `update_dead_host` | ⚠️ Destructive | `host_id`, `domain_names?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `advanced_config?`, `meta?` | Update an existing 404 dead host. Only the given fields are changed. |
| `delete_dead_host` | ⚠️ Destructive | `host_id` | Delete a 404 dead host by ID |
| `enable_dead_host` | ✏️ Write | `host_id` | Enable a 404 dead host |
| `disable_dead_host` | ⚠️ Destructive | `host_id` | Disable a 404 dead host |

## Certificates

SSL certificates and Let's Encrypt challenges.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_certificates` | 📖 Read | `expand?` | List all SSL certificates including their expiry date (expires_on) |
| `get_certificate` | 📖 Read | `certificate_id`, `expand?` | Get details of an SSL certificate by ID |
| `request_certificate` | ✏️ Write | `domain_names`, `nice_name?`, `key_type?`, `dns_challenge?`, `dns_provider?`, `dns_provider_credentials?`, `propagation_seconds?` | Request a new Let's Encrypt certificate (HTTP-01 by default, DNS-01 with dns_challenge) |
| `delete_certificate` | ⚠️ Destructive | `certificate_id` | Delete an SSL certificate by ID |
| `renew_certificate` | ✏️ Write | `certificate_id` | Renew a Let's Encrypt certificate now |
| `list_dns_providers` | 📖 Read | – | List DNS providers supported for DNS-01 challenges |
| `test_http_challenge` | 📖 Read | `domains` | Check whether domains are reachable for a Let's Encrypt HTTP-01 challenge (changes nothing) |

## Access lists

Basic auth users and IP rules.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_access_lists` | 📖 Read | `expand?` | List all access lists (basic auth users and IP rules) |
| `get_access_list` | 📖 Read | `access_list_id`, `expand?` | Get an access list by ID |
| `create_access_list` | ✏️ Write | `name`, `satisfy_any?`, `pass_auth?`, `items?`, `clients?` | Create a new access list |
| `update_access_list` | ⚠️ Destructive | `access_list_id`, `name?`, `satisfy_any?`, `pass_auth?`, `items?`, `clients?` | Update an access list. Only the given fields are changed; items and clients replace the existing entries. |
| `delete_access_list` | ⚠️ Destructive | `access_list_id` | Delete an access list by ID |

## Users

NPM users. Changes require an administrator.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_users` | 📖 Read | `expand?` | List all NPM users |
| `get_user` | 📖 Read | `user_id`, `expand?` | Get an NPM user by ID |
| `create_user` | ✏️ Write | `name`, `nickname?`, `email`, `roles?`, `is_disabled?` | Create a new NPM user (password and permissions are set in the NPM UI) |
| `update_user` | ⚠️ Destructive | `user_id`, `name?`, `nickname?`, `email?`, `roles?`, `is_disabled?` | Update an NPM user. Only the given fields are changed. |
| `delete_user` | ⚠️ Destructive | `user_id` | Delete an NPM user by ID |

## Settings

Global NPM settings, e.g. the default site.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_settings` | 📖 Read | – | List all NPM settings |
| `get_setting` | 📖 Read | `setting_id` | Get an NPM setting by ID |
| `update_setting` | ⚠️ Destructive | `setting_id`, `value?`, `meta?` | Update an NPM setting, e.g. the behaviour of the default site |

## Reports

Audit log and counters.

| Tool | Kind | Parameters | Description |
|---|---|---|---|
| `list_audit_log` | 📖 Read | – | List recent audit log entries (who changed what) |
| `get_host_report` | 📖 Read | – | Get the number of proxy, redirection, stream and dead hosts |

## Examples

Create a proxy host:

```json
{
    "name": "create_proxy_host",
    "arguments": {
        "domain_names": ["app.example.com"],
        "forward_scheme": "http",
        "forward_host": "10.0.0.5",
        "forward_port": 8080,
        "certificate_id": 3,
        "ssl_forced": true,
        "access_list_id": 1
    }
}
```

Change only the target of a proxy host:

```json
{
    "name": "update_proxy_host",
    "arguments": {"host_id": 12, "forward_port": 8081}
}
```

Request a certificate via DNS challenge:

```json
{
    "name": "request_certificate",
    "arguments": {
        "domain_names": ["*.example.com", "example.com"],
        "dns_challenge": true,
        "dns_provider": "cloudflare",
        "dns_provider_credentials": "dns_cloudflare_api_token = ...",
        "propagation_seconds": 120
    }
}
```

Create an access list with IP rules:

```json
{
    "name": "create_access_list",
    "arguments": {
        "name": "Intern",
        "satisfy_any": true,
        "clients": [
            {"address": "192.168.0.0/16", "directive": "allow"},
            {"address": "all", "directive": "deny"}
        ]
    }
}
```
