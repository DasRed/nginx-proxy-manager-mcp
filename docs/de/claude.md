---
title: In Claude einbinden
description: nginx-proxy-manager-mcp als Custom Connector in Claude (Web, Desktop, Mobile) oder als Remote-MCP-Server in Claude Code einbinden, testen und Fehler finden.
order: 30
slug: claude
section: Einrichtung
---

## Voraussetzungen

- nginx-proxy-manager-mcp läuft und ist per HTTPS aus dem Internet erreichbar, z. B. unter `https://npm.mcp.example.com/mcp`.
- Der Zugriff ist abgesichert (siehe [Sicherheit](security.md)).

> [!IMPORTANT]
> Custom Connectors in Claude verbinden sich von den Servern von Anthropic aus, nicht von deinem Rechner. Eine URL, die nur in deinem Heimnetz funktioniert, reicht nicht.

## Claude (Web, Desktop, Mobile)

1. **Einstellungen** → **Connectors** → **Custom Connector hinzufügen**.
2. Name: z. B. `Nginx Proxy Manager`.
3. URL: `https://npm.mcp.example.com/mcp`
4. Speichern.

Claude-Connectors können keine eigenen Header mitschicken, also auch keinen Bearer-Token. Sichere den Endpunkt deshalb am Reverse Proxy ab, z. B. über eine Access List in NPM mit den [ausgehenden IP-Adressen von Anthropic](https://docs.claude.com/en/api/ip-addresses).

Bei aktivem Schreibmodus kannst du in den Connector-Einstellungen von Claude pro Tool festlegen, ob Claude vorher nachfragen muss. Für `delete_*`, `disable_*` und `update_*` ist das sinnvoll.

## Claude Code

In Claude Code kannst du den Bearer-Token direkt mitgeben:

```sh
claude mcp add --transport http nginx-proxy-manager https://npm.mcp.example.com/mcp \
  --header "Authorization: Bearer dein-mcp-auth-token"
```

Dafür muss `MCP_AUTH_TOKEN` am Server gesetzt sein.

## Testen

Frag Claude zum Beispiel:

- „Welche Proxy Hosts gibt es im Nginx Proxy Manager?"
- „Welche Zertifikate laufen in den nächsten 30 Tagen ab?"
- „Welche Hosts nutzen die Access List ‚Intern'?"

Claude sollte dafür `list_proxy_hosts`, `list_certificates` bzw. `list_access_lists` aufrufen.

## Fehlersuche

| Symptom                              | Ursache                                                                                  |
|--------------------------------------|------------------------------------------------------------------------------------------|
| Connector lässt sich nicht verbinden | Server nicht öffentlich erreichbar oder die Access List blockt die IPs von Anthropic.    |
| `401 Unauthorized`                   | `MCP_AUTH_TOKEN` ist gesetzt, der Client schickt aber keinen oder einen falschen Token.  |
| `405 Method not allowed`             | Normal bei `GET`. Der Server ist stateless und nimmt nur `POST` an.                      |
| Tools fehlen                         | `MCP_READ_ONLY` oder die Allow/Deny-Listen filtern sie raus.                             |
| Tool meldet Login-Fehler             | `NPM_EMAIL`/`NPM_PASSWORD` falsch oder 2FA ist für den Benutzer aktiv.                   |
| Tool meldet `403`                    | Dem NPM-Benutzer fehlen die Rechte (z. B. **View Only** statt **Manage**).               |

Nach Änderungen an den Tools musst du den Connector in Claude einmal trennen und neu verbinden, damit Claude die neue Tool-Liste lädt.
