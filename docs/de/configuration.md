---
title: Konfiguration
description: Alle Umgebungsvariablen von nginx-proxy-manager-mcp mit Standardwerten, Tool-Filtern und NPM-Benutzer.
order: 20
slug: konfiguration
section: Einrichtung
---

## Umgebungsvariablen

nginx-proxy-manager-mcp wird komplett über Umgebungsvariablen konfiguriert. Eine Vorlage findest du in [`.env.example`](https://github.com/DasRed/nginx-proxy-manager-mcp/blob/main/.env.example).

| Name              | Standard  | Beschreibung                                                                                              |
|-------------------|-----------|-----------------------------------------------------------------------------------------------------------|
| `NPM_URL`         | –         | Pflicht. Admin-URL von NPM, z. B. `http://nginx-proxy-manager:81`. Ein angehängtes `/api` ist egal.       |
| `NPM_EMAIL`       | –         | Pflicht. E-Mail des NPM-Benutzers, mit dem sich der Server anmeldet.                                      |
| `NPM_PASSWORD`    | –         | Pflicht. Passwort dieses Benutzers.                                                                       |
| `NPM_TIMEOUT_MS`  | `30000`   | Timeout pro Anfrage an NPM in Millisekunden (1000 bis 600000).                                            |
| `HOST`            | `0.0.0.0` | Adresse, auf der der Server lauscht.                                                                      |
| `PORT`            | `3000`    | Port des Servers.                                                                                         |
| `MCP_PATH`        | `/mcp`    | Pfad des MCP-Endpunkts.                                                                                   |
| `MCP_READ_ONLY`   | `true`    | Nur lesende Tools anbieten. Akzeptiert `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off`.                  |
| `MCP_TOOLS_ALLOW` | –         | Kommagetrennte Tool-Namen, die übrig bleiben sollen. `*` ist Platzhalter.                                 |
| `MCP_TOOLS_DENY`  | –         | Kommagetrennte Tool-Namen, die entfernt werden. `*` ist Platzhalter.                                      |
| `MCP_AUTH_TOKEN`  | –         | Wenn gesetzt, verlangt `/mcp` den Header `Authorization: Bearer <token>`.                                 |

Fehlende Pflichtwerte oder ungültige Werte brechen den Start mit einer klaren Fehlermeldung ab.

## NPM-Benutzer anlegen

NPM hat keine API-Keys, nur Benutzer-Logins. Leg deshalb einen eigenen Benutzer für den MCP-Server an, statt deinen Admin-Zugang zu verwenden.

1. In NPM **Users** → **Add User**.
2. Name und E-Mail vergeben, z. B. `claude@example.com`. **Kein** Administrator.
3. Unter **Permissions** die Rechte setzen:
   - Nur lesen: überall **View Only**.
   - Schreiben: **Manage** für die Bereiche, die Claude ändern darf.
4. Passwort setzen und als `NPM_PASSWORD` eintragen.

> [!IMPORTANT]
> Zwei-Faktor-Login wird nicht unterstützt. Ist 2FA für den Benutzer aktiv, schlägt die Anmeldung fehl.

Benutzer und Einstellungen kann in NPM nur ein Administrator ändern. Die Tools `create_user`, `update_user`, `delete_user` und `update_setting` funktionieren mit einem normalen Benutzer also nicht. Das ist so gewollt.

Der Server meldet sich einmal an, merkt sich den Token bis kurz vor Ablauf und meldet sich bei einem `401` automatisch neu an.

## Tool-Filter

Die Filter laufen in dieser Reihenfolge:

1. **`MCP_READ_ONLY`** wirft alle schreibenden Tools raus.
2. **`MCP_TOOLS_ALLOW`** behält nur passende Tools (wenn gesetzt).
3. **`MCP_TOOLS_DENY`** entfernt passende Tools.

Beispiele:

```sh
# Nur Proxy Hosts und Zertifikate lesen
MCP_TOOLS_ALLOW=*_proxy_host*,*_certificate*

# Schreiben erlaubt, aber keine Benutzer und Einstellungen
MCP_READ_ONLY=false
MCP_TOOLS_DENY=*_user,*_users,update_setting

# Schreiben erlaubt, aber nichts löschen
MCP_READ_ONLY=false
MCP_TOOLS_DENY=delete_*
```

Welche Tools es gibt, siehst du unter [Tools](tools.md).

## Beispiel

```sh
NPM_URL=http://nginx-proxy-manager:81
NPM_EMAIL=claude@example.com
NPM_PASSWORD=dein-passwort
MCP_READ_ONLY=false
MCP_TOOLS_DENY=*_user
```
