---
title: Überblick
description: nginx-proxy-manager-mcp macht die API von Nginx Proxy Manager als Remote-MCP-Server für Claude nutzbar.
order: 0
section: Einstieg
---

## Was ist nginx-proxy-manager-mcp?

nginx-proxy-manager-mcp ist ein [MCP](https://modelcontextprotocol.io)-Server für [Nginx Proxy Manager](https://nginxproxymanager.com) (NPM). Er läuft als Docker-Container und spricht Streamable HTTP, damit du ihn in Claude als Custom Connector einbinden kannst.

Damit kann Claude deine Proxy Hosts, Redirects, Streams, 404-Hosts, Zertifikate und Access Lists lesen und, wenn du es erlaubst, auch anlegen und ändern.

## Wofür?

- **Überblick**: Welche Domain zeigt auf welchen Container, mit welchem Zertifikat und welcher Access List?
- **Zertifikate**: Welche Let's-Encrypt-Zertifikate laufen bald ab?
- **Einrichtung**: „Leg mir `app.example.com` auf `10.0.0.5:8080` an, mit Wildcard-Zertifikat und HTTPS erzwungen.“
- **Nachvollziehen**: Das Audit-Log zeigt, wer wann was geändert hat.

## Tools

Es gibt 50 Tools in neun Bereichen: Proxy Hosts, Redirection Hosts, Streams, 404-Hosts, Zertifikate, Access Lists, Benutzer, Einstellungen und Berichte. 20 davon lesen nur.

Standardmäßig sind nur die lesenden Tools aktiv. Die komplette Liste findest du unter [Tools](tools.md).

## Basis

Der Tool-Umfang orientiert sich an [VeryBigSad/nginx-proxy-manager-mcp](https://github.com/VeryBigSad/nginx-proxy-manager-mcp) (Python, stdio). Der Code ist eine eigene Implementierung in Node.js und TypeScript und ergänzt:

- HTTP-Transport (stateless, jeder `POST` bekommt eine eigene MCP-Instanz)
- Nur-Lesen-Modus als Standard
- Teil-Updates: `update_*` schickt nur die Felder, die du angibst
- Login mit Token-Cache und automatischem Neu-Login bei `401`
- Allow- und Deny-Listen mit `*` als Platzhalter
- Optionaler Bearer-Token für den MCP-Endpunkt und Health-Check unter `/healthz`

## Status

Aktiv im Einsatz. Das Image wird bei jedem Release automatisch nach `ghcr.io/dasred/nginx-proxy-manager-mcp` gebaut.

## Weiter

1. [Installation](installation.md)
2. [Konfiguration](configuration.md)
3. [In Claude einbinden](claude.md)
