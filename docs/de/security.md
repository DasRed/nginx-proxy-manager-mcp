---
title: Sicherheit
description: Welche Rechte nginx-proxy-manager-mcp braucht, was der Server darf und wie du den Endpunkt absicherst.
order: 50
slug: sicherheit
section: Referenz
---

## Standard: nur lesen

Ohne weitere Einstellungen bietet der Server nur die 20 lesenden Tools an. Claude kann dann Hosts, Zertifikate, Access Lists, Benutzer, Einstellungen und das Audit-Log lesen, aber nichts ändern.

Gib dem NPM-Benutzer dazu überall nur **View Only**. Dann ist der Nur-Lesen-Modus doppelt abgesichert: selbst wenn ein schreibendes Tool durchrutscht, lehnt NPM den Aufruf ab.

## Schreibender Modus

Mit `MCP_READ_ONLY=false` und **Manage**-Rechten kann Claude unter anderem:

- Proxy Hosts, Redirects, Streams und 404-Hosts anlegen, ändern, deaktivieren und löschen
- Let's-Encrypt-Zertifikate anfordern, erneuern und löschen
- Access Lists ändern, also festlegen, wer auf welche Dienste zugreifen darf

> [!CAUTION]
> Wer diesen Endpunkt kontrolliert, kontrolliert deinen Reverse Proxy. Ein falscher Proxy Host kann Dienste offenlegen, eine gelöschte Access List schützt nichts mehr. Grenze den Schreibmodus mit `MCP_TOOLS_DENY` ein und lass Claude bei kritischen Tools vorher fragen.

Die Tools sind mit MCP-Hinweisen markiert: `readOnlyHint` für lesende Tools und `destructiveHint` für Tools, die bestehende Konfiguration überschreiben oder entfernen (`update_*`, `delete_*`, `disable_*`). Claude nutzt das, um vor riskanten Aktionen nachzufragen.

`update_*` ändert nur die Felder, die mitgeschickt werden. Ausnahme: `locations` bei Proxy Hosts sowie `items` und `clients` bei Access Lists ersetzen die bestehenden Einträge komplett.

## Zugangsdaten

- NPM kennt nur Benutzer-Logins. Verwende einen eigenen Benutzer, nie deinen Admin.
- Kein Administrator: Dann kann der Server weder Benutzer noch Einstellungen ändern, selbst wenn die Tools aktiv sind.
- E-Mail und Passwort bleiben im Container. Sie gehen nur an `NPM_URL`, nie an Claude.
- Der NPM-Token liegt nur im Speicher und wird nicht protokolliert.

## Endpunkt absichern

Wer `/mcp` erreicht, kann alle aktiven Tools mit dem NPM-Benutzer aufrufen. Lass den Endpunkt deshalb nie offen im Netz stehen.

| Variante                        | Geeignet für                  | Umsetzung                                                    |
|---------------------------------|-------------------------------|--------------------------------------------------------------|
| Access List in NPM              | Claude (Web, Desktop, Mobile) | Nur die [IPs von Anthropic](https://docs.claude.com/en/api/ip-addresses) und dein eigenes Netz zulassen. |
| Bearer-Token (`MCP_AUTH_TOKEN`) | Claude Code, eigene Clients   | Langen Zufallswert setzen, z. B. `openssl rand -hex 32`.     |
| Nur intern                      | Clients im selben Netz        | Keinen Port veröffentlichen, nur im Docker-Netzwerk erreichbar. |

Der Token-Vergleich läuft zeitkonstant. `/healthz` ist absichtlich ohne Authentifizierung erreichbar und gibt nur `{"status":"ok"}` zurück.

> [!TIP]
> Die Admin-Oberfläche von NPM (Port `81`) muss für den MCP-Server nicht öffentlich sein. Im selben Docker-Netzwerk reicht der Containername.

## Container

- Der Server ist stateless und schreibt nichts auf die Platte. Du kannst ihn mit `read_only: true`, `cap_drop: ALL` und `no-new-privileges` betreiben.
- Anfragen an `/mcp` sind auf 4 MB begrenzt.
- Secrets gehören in eine `.env` oder einen Secret Store, nicht in die `compose.yaml` im Git-Repository.
