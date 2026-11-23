---
title: Tools
description: Referenz aller 50 Tools von nginx-proxy-manager-mcp für Proxy Hosts, Redirections, Streams, Zertifikate und Access Lists, mit Parametern und Beispielen.
order: 40
slug: tools
section: Referenz
---

## Übersicht

nginx-proxy-manager-mcp bringt 50 Tools mit: 20 lesen nur, 30 schreiben und 18 davon gelten als destruktiv, weil sie bestehende Konfiguration überschreiben oder entfernen.

Im Standardmodus (`MCP_READ_ONLY=true`) sind nur die Tools mit 📖 aktiv. Mehr dazu unter [Konfiguration](configuration.md) und [Sicherheit](security.md).

| Art | Bedeutung | MCP-Hinweis |
|---|---|---|
| 📖 Lesen | Liest nur, ändert nichts | `readOnlyHint: true` |
| ✏️ Schreiben | Legt etwas an oder schaltet es ein | – |
| ⚠️ Destruktiv | Überschreibt, deaktiviert oder löscht | `destructiveHint: true` |

> [!NOTE]
> Optionale Parameter sind mit `?` markiert. Bei `update_*` sind außer der ID alle Felder optional, geändert wird nur, was du mitschickst.

## Gemeinsame Parameter

| Name | Beschreibung |
|---|---|
| `expand` | Liste verknüpfter Objekte, die mitgeladen werden. Proxy Hosts: `access_list`, `owner`, `certificate`. Redirects, Streams, 404-Hosts: `owner`, `certificate`. Zertifikate: `owner`. |
| `domain_names` | Liste von Domains, z. B. `["app.example.com"]`, maximal 100. |
| `certificate_id` | ID des Zertifikats, `0` für keins. |
| `access_list_id` | ID der Access List, `0` für öffentlich. |
| `ssl_forced`, `hsts_enabled`, `hsts_subdomains`, `http2_support` | SSL-Schalter wie in der NPM-Oberfläche. |
| `advanced_config` | Eigene nginx-Konfiguration, maximal 16 KB. |
| `locations` | Eigene Locations eines Proxy Hosts. Ersetzt alle bestehenden. |

## Proxy Hosts

Weiterleitungen von Domains auf interne Dienste.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_proxy_hosts` | 📖 Lesen | `expand?` | Listet alle Proxy Hosts. |
| `get_proxy_host` | 📖 Lesen | `host_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_proxy_host` | ✏️ Schreiben | `domain_names`, `forward_scheme?`, `forward_host`, `forward_port`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `caching_enabled?`, `allow_websocket_upgrade?`, `access_list_id?`, `advanced_config?`, `meta?`, `locations?` | Legt einen neuen Eintrag an. |
| `update_proxy_host` | ⚠️ Destruktiv | `host_id`, `domain_names?`, `forward_scheme?`, `forward_host?`, `forward_port?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `caching_enabled?`, `allow_websocket_upgrade?`, `access_list_id?`, `advanced_config?`, `meta?`, `locations?` | Ändert einen Eintrag. Nur die angegebenen Felder werden geändert. |
| `delete_proxy_host` | ⚠️ Destruktiv | `host_id` | Löscht einen Eintrag per ID. |
| `enable_proxy_host` | ✏️ Schreiben | `host_id` | Aktiviert einen Eintrag. |
| `disable_proxy_host` | ⚠️ Destruktiv | `host_id` | Deaktiviert einen Eintrag. |

## Redirection Hosts

HTTP-Redirects auf andere Domains.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_redirection_hosts` | 📖 Lesen | `expand?` | Listet alle Redirection Hosts. |
| `get_redirection_host` | 📖 Lesen | `host_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_redirection_host` | ✏️ Schreiben | `domain_names`, `forward_scheme?`, `forward_http_code`, `forward_domain_name`, `preserve_path?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `advanced_config?`, `meta?` | Legt einen neuen Eintrag an. |
| `update_redirection_host` | ⚠️ Destruktiv | `host_id`, `domain_names?`, `forward_scheme?`, `forward_http_code?`, `forward_domain_name?`, `preserve_path?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `block_exploits?`, `advanced_config?`, `meta?` | Ändert einen Eintrag. Nur die angegebenen Felder werden geändert. |
| `delete_redirection_host` | ⚠️ Destruktiv | `host_id` | Löscht einen Eintrag per ID. |
| `enable_redirection_host` | ✏️ Schreiben | `host_id` | Aktiviert einen Eintrag. |
| `disable_redirection_host` | ⚠️ Destruktiv | `host_id` | Deaktiviert einen Eintrag. |

## Streams

TCP/UDP-Weiterleitungen auf Portebene.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_streams` | 📖 Lesen | `expand?` | Listet alle TCP/UDP-Streams. |
| `get_stream` | 📖 Lesen | `stream_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_stream` | ✏️ Schreiben | `incoming_port`, `forwarding_host`, `forwarding_port`, `tcp_forwarding?`, `udp_forwarding?`, `certificate_id?`, `meta?` | Legt einen neuen Eintrag an. |
| `update_stream` | ⚠️ Destruktiv | `stream_id`, `incoming_port?`, `forwarding_host?`, `forwarding_port?`, `tcp_forwarding?`, `udp_forwarding?`, `certificate_id?`, `meta?` | Ändert einen Eintrag. Nur die angegebenen Felder werden geändert. |
| `delete_stream` | ⚠️ Destruktiv | `stream_id` | Löscht einen Eintrag per ID. |
| `enable_stream` | ✏️ Schreiben | `stream_id` | Aktiviert einen Eintrag. |
| `disable_stream` | ⚠️ Destruktiv | `stream_id` | Deaktiviert einen Eintrag. |

## 404-Hosts

Domains, die bewusst mit 404 antworten.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_dead_hosts` | 📖 Lesen | `expand?` | Listet alle 404-Hosts. |
| `get_dead_host` | 📖 Lesen | `host_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_dead_host` | ✏️ Schreiben | `domain_names`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `advanced_config?`, `meta?` | Legt einen neuen Eintrag an. |
| `update_dead_host` | ⚠️ Destruktiv | `host_id`, `domain_names?`, `certificate_id?`, `ssl_forced?`, `hsts_enabled?`, `hsts_subdomains?`, `http2_support?`, `advanced_config?`, `meta?` | Ändert einen Eintrag. Nur die angegebenen Felder werden geändert. |
| `delete_dead_host` | ⚠️ Destruktiv | `host_id` | Löscht einen Eintrag per ID. |
| `enable_dead_host` | ✏️ Schreiben | `host_id` | Aktiviert einen Eintrag. |
| `disable_dead_host` | ⚠️ Destruktiv | `host_id` | Deaktiviert einen Eintrag. |

## Zertifikate

SSL-Zertifikate und Let's-Encrypt-Challenges.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_certificates` | 📖 Lesen | `expand?` | Listet alle SSL-Zertifikate inklusive Ablaufdatum (`expires_on`). |
| `get_certificate` | 📖 Lesen | `certificate_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `request_certificate` | ✏️ Schreiben | `domain_names`, `nice_name?`, `key_type?`, `dns_challenge?`, `dns_provider?`, `dns_provider_credentials?`, `propagation_seconds?` | Fordert ein neues Let's-Encrypt-Zertifikat an (Standard HTTP-01, mit `dns_challenge` DNS-01). |
| `delete_certificate` | ⚠️ Destruktiv | `certificate_id` | Löscht einen Eintrag per ID. |
| `renew_certificate` | ✏️ Schreiben | `certificate_id` | Erneuert ein Let's-Encrypt-Zertifikat sofort. |
| `list_dns_providers` | 📖 Lesen | – | Listet die DNS-Provider, die für DNS-01-Challenges unterstützt werden. |
| `test_http_challenge` | 📖 Lesen | `domains` | Prüft, ob Domains für eine HTTP-01-Challenge erreichbar sind. Ändert nichts. |

## Access Lists

Basic-Auth-Benutzer und IP-Regeln.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_access_lists` | 📖 Lesen | `expand?` | Listet alle Access Lists (Basic-Auth-Benutzer und IP-Regeln). |
| `get_access_list` | 📖 Lesen | `access_list_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_access_list` | ✏️ Schreiben | `name`, `satisfy_any?`, `pass_auth?`, `items?`, `clients?` | Legt einen neuen Eintrag an. |
| `update_access_list` | ⚠️ Destruktiv | `access_list_id`, `name?`, `satisfy_any?`, `pass_auth?`, `items?`, `clients?` | Ändert eine Access List. Nur die angegebenen Felder werden geändert, `items` und `clients` ersetzen die bestehenden Einträge. |
| `delete_access_list` | ⚠️ Destruktiv | `access_list_id` | Löscht einen Eintrag per ID. |

## Benutzer

NPM-Benutzer. Ändern geht nur als Administrator.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_users` | 📖 Lesen | `expand?` | Listet alle NPM-Benutzer. |
| `get_user` | 📖 Lesen | `user_id`, `expand?` | Zeigt Details zu einem Eintrag per ID. |
| `create_user` | ✏️ Schreiben | `name`, `nickname?`, `email`, `roles?`, `is_disabled?` | Legt einen NPM-Benutzer an. Passwort und Rechte setzt du in der NPM-Oberfläche. |
| `update_user` | ⚠️ Destruktiv | `user_id`, `name?`, `nickname?`, `email?`, `roles?`, `is_disabled?` | Ändert einen Eintrag. Nur die angegebenen Felder werden geändert. |
| `delete_user` | ⚠️ Destruktiv | `user_id` | Löscht einen Eintrag per ID. |

## Einstellungen

Globale NPM-Einstellungen, z. B. die Default-Site.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_settings` | 📖 Lesen | – | Listet alle NPM-Einstellungen. |
| `get_setting` | 📖 Lesen | `setting_id` | Zeigt Details zu einem Eintrag per ID. |
| `update_setting` | ⚠️ Destruktiv | `setting_id`, `value?`, `meta?` | Ändert eine NPM-Einstellung, z. B. das Verhalten der Default-Site. |

## Berichte

Audit-Log und Zähler.

| Tool | Art | Parameter | Beschreibung |
|---|---|---|---|
| `list_audit_log` | 📖 Lesen | – | Listet die letzten Einträge im Audit-Log (wer hat was geändert). |
| `get_host_report` | 📖 Lesen | – | Zählt Proxy Hosts, Redirection Hosts, Streams und 404-Hosts. |

## Beispiele

Proxy Host anlegen:

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

Nur das Ziel eines Proxy Hosts ändern:

```json
{
    "name": "update_proxy_host",
    "arguments": {"host_id": 12, "forward_port": 8081}
}
```

Zertifikat per DNS-Challenge anfordern:

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

Access List mit IP-Regeln anlegen:

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
