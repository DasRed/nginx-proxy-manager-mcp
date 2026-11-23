---
title: Andere MCP-Clients
description: nginx-proxy-manager-mcp per JSON-Konfiguration in andere MCP-Clients einbinden, direkt per HTTP oder über mcp-remote für Clients, die nur stdio unterstützen.
order: 35
slug: andere-clients
section: Einrichtung
---

Viele MCP-Clients werden über einen JSON-Eintrag unter `mcpServers` konfiguriert, z. B. die `.mcp.json` von Claude Code oder Clients mit eigener Weboberfläche. Für nginx-proxy-manager-mcp gibt es zwei Varianten.

## Eintrag per HTTP

Für Clients, die Remote-Server per HTTP unterstützen:

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "type": "http",
      "url": "https://npm.mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer dein-mcp-auth-token"
      }
    }
  }
}
```

- `type` heißt je nach Client `http` oder `streamable-http`.
- `headers` lässt du weg, wenn `MCP_AUTH_TOKEN` auf dem Server nicht gesetzt ist.
- Solche Clients verbinden sich von deinem Rechner aus. Hier reicht deshalb auch eine Adresse im Heimnetz, z. B. `http://192.168.1.10:3000/mcp`.

## Clients nur mit stdio (mcp-remote)

Clients, die nur lokale Server per stdio starten (z. B. die `claude_desktop_config.json` von Claude Desktop), bindest du über [mcp-remote](https://www.npmjs.com/package/mcp-remote) an:

```json
{
  "mcpServers": {
    "nginx-proxy-manager": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://npm.mcp.example.com/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer dein-mcp-auth-token"
      }
    }
  }
}
```

Der Token steht in `env`, weil manche Clients Leerzeichen in `args` nicht sauber übergeben. Für eine `http://`-Adresse außerhalb von `localhost` braucht mcp-remote zusätzlich `--allow-http`.

## Testen

Testen und Fehlersuche funktionieren wie unter [In Claude einbinden](claude.md) beschrieben. Nach einer Änderung der Tools lädst du die Konfiguration im Client neu oder startest ihn neu, damit er die neue Tool-Liste lädt.
