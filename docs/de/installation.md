---
title: Installation
description: nginx-proxy-manager-mcp als Docker-Container neben Nginx Proxy Manager starten.
order: 10
slug: installation
section: Einrichtung
---

## Image

Das Image liegt in der GitHub Container Registry und ist für `linux/amd64` und `linux/arm64` gebaut:

```text
ghcr.io/dasred/nginx-proxy-manager-mcp
```

Verfügbare Tags: `latest`, `<major>` (z. B. `1`), `<major>.<minor>` und die volle Version. Für den Dauerbetrieb nimmst du am besten den Major-Tag.

## Voraussetzungen

- Ein laufender Nginx Proxy Manager. Der MCP-Server spricht mit der Admin-API auf Port `81`.
- Ein eigener NPM-Benutzer ohne Zwei-Faktor-Login (siehe [Konfiguration](configuration.md#npm-benutzer-anlegen)).

## Schnellstart

```sh
docker run -d --name mcp-nginx-proxy-manager \
  -p 3000:3000 \
  -e NPM_URL=http://nginx-proxy-manager:81 \
  -e NPM_EMAIL=claude@example.com \
  -e NPM_PASSWORD=dein-passwort \
  ghcr.io/dasred/nginx-proxy-manager-mcp:1
```

Prüfen, ob der Server läuft:

```sh
curl http://localhost:3000/healthz
```

Antwort: `{"status":"ok"}`. Der Health-Check prüft nur den MCP-Server selbst, nicht die Verbindung zu NPM.

## Docker Compose

Am einfachsten läuft der Container im selben Docker-Netzwerk wie NPM. Dann erreicht er die Admin-API über den Containernamen, und Port `81` muss nicht nach außen offen sein.

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

E-Mail und Passwort legst du in eine `.env` neben der `compose.yaml`, nicht direkt in die Datei.

> [!TIP]
> Der Server speichert nichts auf der Platte. Den NPM-Token hält er nur im Speicher. `read_only: true` und `cap_drop: ALL` funktionieren deshalb ohne Volumes.

## Ports und Endpunkte

| Pfad       | Methode | Beschreibung                                 |
|------------|---------|----------------------------------------------|
| `/mcp`     | `POST`  | MCP-Endpunkt (Pfad über `MCP_PATH` änderbar) |
| `/healthz` | `GET`   | Health-Check, ohne Authentifizierung         |

Der Container lauscht auf Port `3000`. Andere Methoden als `POST` auf `/mcp` beantwortet der Server mit `405`, weil er stateless läuft.

## Über NPM selbst veröffentlichen

Damit Claude den Server erreicht, braucht er eine HTTPS-Adresse. Meist legst du dafür in NPM selbst einen Proxy Host an, z. B. `npm.mcp.example.com` → `mcp-nginx-proxy-manager:3000`.

> [!WARNING]
> Henne-Ei-Problem: Fällt NPM aus, ist auch der MCP-Server nicht mehr erreichbar. Zum Reparieren von NPM brauchst du also weiterhin einen Weg ohne Claude.

Wie du den Zugriff absicherst, steht unter [Sicherheit](security.md).
