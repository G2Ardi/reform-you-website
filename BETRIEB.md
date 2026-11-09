# Reform You Website: Betrieb im Rechenzentrum

Anleitung für die Inbetriebnahme und den laufenden Betrieb. Stand: 5. November 2026.

## Was das ist

Website und Buchungssystem für Reform You Pilates Studio (Standorte Wassenberg und Wegberg).

| Baustein | Technik |
|---|---|
| Website und Buchung | Next.js 16 (Node 22), läuft als Docker-Container `app` |
| Datenbank | PostgreSQL 16, Container `db`, Daten im Docker-Volume `dbdaten` |
| Migrationen | Container `migrate`, läuft bei jedem Start und legt die Tabellen an oder aktualisiert sie |
| Täglicher Job | Container `cron`, 06:00 UTC: Gutschein-Codes am Lieferdatum und Erinnerungsmails |
| Sicherung | Container `backup`, täglich ein Dump nach `./backups` |
| HTTPS (optional) | Container `caddy` über `--profile proxy` |

Alles wird mit `docker compose` gestartet. Es gibt keine weiteren Abhängigkeiten außer Internet beim Bauen.

## Voraussetzungen

- Linux-VM (zum Beispiel Ubuntu 24.04) mit Docker Engine und dem Compose-Plugin
- Internetzugang der VM beim Bauen (npm, Docker-Images) und später für Mails (SMTP) und Stripe
- Eine öffentliche Adresse für reform-you.de: Reverse Proxy der Firewall oder das mitgelieferte Caddy
- Mindestens 2 GB RAM

## Erststart

Im Ordner dieser Datei:

```
cp .env.beispiel .env
nano .env
docker compose up -d --build
docker compose run --rm -e SEED_TESTDATEN=nein migrate npx prisma db seed
```

1. In `.env` alle Werte mit `CHANGE_ME` ausfüllen. Geheime Werte mit `openssl rand -hex 24` erzeugen, nur Buchstaben und Zahlen verwenden.
2. `docker compose up -d --build` baut die Images, startet die Datenbank, legt die Tabellen an und startet die Website. Das erste Bauen dauert einige Minuten.
3. Der Seed-Befehl legt einmalig Standorte, Kurse, Preise, Events und Einstellungen an. Er legt keinen Testkunden an. Nur einmal ausführen, nicht bei jedem Update.

Prüfen:

```
docker compose ps
curl http://127.0.0.1:3000/api/health
```

Alle Container laufen (`migrate` ist beendet, das ist richtig), die Health-Adresse antwortet mit `{"status":"ok"}`. Sie antwortet nur dann mit 200, wenn die Datenbank erreichbar ist.

## Kurstermine (wichtig)

Die Website zeigt Termine, die in der Datenbank stehen. Eine Terminverwaltung im Admin-Bereich gibt es noch nicht. Bis dahin entstehen die Termine aus einem Wochenplan in `prisma/termine.ts`. Dieser Plan ist **ein Platzhalter**, nicht Janinas echter Stundenplan. Vor dem Livegang den echten Wochenplan dort eintragen (Wochentag, Uhrzeit, Kurs), neu bauen und Termine erzeugen:

```
docker compose build migrate
docker compose run --rm migrate npm run db:termine -- 56
```

Die Zahl ist die Anzahl der Tage im Voraus. Vorhandene Termine werden übersprungen, der Befehl kann beliebig oft laufen. Er muss regelmäßig wiederholt werden, sonst gehen der Website die Termine aus. Eine Terminverwaltung im Admin ist der sinnvolle nächste Ausbau.

## Erster Admin und Zugänge

1. Im Browser `/admin/login` öffnen.
2. Janinas E-Mail-Adresse und als Passwort den Wert `ADMIN_PASSWORT` aus der `.env` eingeben. Gibt es noch keinen Mitarbeiter, legt dieser Login den ersten Admin mit Umsatzrecht an.
3. Im Menü unter Mitarbeiter ein eigenes Passwort für Janina setzen und Trainer anlegen. Danach `ADMIN_PASSWORT` in der `.env` ändern und `docker compose up -d` ausführen.

Rollen: Admin mit Umsatzrecht (alles, auch Umsatz und Mitarbeiter), Admin ohne Umsatzrecht, Trainer (Teilnehmerliste, anwesend oder nicht erschienen).

## HTTPS und Reverse Proxy

**Variante A, bestehender Reverse Proxy.** Er leitet auf `127.0.0.1:3000` der VM weiter und setzt `X-Forwarded-For` und `X-Forwarded-Proto`. Wenn der Proxy auf einer anderen Maschine sitzt, in `.env` `APP_BIND=0.0.0.0:3000` setzen und den Zugriff per Firewall auf den Proxy beschränken.

**Variante B, Caddy aus diesem Setup.** In `.env` `DOMAIN` setzen, DNS auf die öffentliche IP richten, Ports 80 und 443 freigeben, dann:

```
docker compose --profile proxy up -d
```

Das Zertifikat holt Caddy automatisch bei Let's Encrypt. `NEXT_PUBLIC_BASE_URL` in der `.env` muss die endgültige https-Adresse sein, sie steckt in den Links der E-Mails.

## E-Mail

Ohne SMTP-Angaben verschickt die Website nichts, sie läuft aber weiter. In `.env` `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` und `SMTP_FROM` eintragen, dann `docker compose up -d`. Für die Zustellbarkeit müssen SPF, DKIM und DMARC der Domain zum Absender passen. Test: ein Kundenkonto anlegen und etwas buchen, die Bestätigung muss ankommen. Benachrichtigungen an das Studio gehen an `STUDIO_BENACHRICHTIGUNG_EMAIL` (info@reform-you.de).

## Täglicher Job

Der Container `cron` ruft täglich um 06:00 UTC `/api/cron/taeglich` auf. Der Job verschickt Gutschein-Codes, deren Lieferdatum erreicht ist, und fällige Erinnerungsmails. Beides ist idempotent. Der Aufruf braucht `CRON_SECRET`. Test von Hand:

```
docker compose exec cron wget -q -O- --header "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/taeglich
```

Ohne das Geheimnis antwortet die Adresse mit 401. Der Job kann auch im Admin unter Versand von Hand ausgelöst werden.

## Datensicherung

Der Container `backup` legt täglich einen Dump in `./backups` ab (`reformyou-JJJJ-MM-TT-HHMM.dump`) und löscht Sicherungen nach `BACKUP_TAGE` Tagen (Standard 14).

Der Ordner liegt auf demselben Host wie die Datenbank. Er muss zusätzlich auf ein anderes System gesichert werden (Proxmox Backup Server, Netzlaufwerk oder rsync), sonst ist es keine echte Sicherung. Einmal vor dem Livegang eine Wiederherstellung testen.

Wiederherstellen:

```
docker compose stop app cron
docker compose exec -T db pg_restore -U reformyou -d reformyou --clean --if-exists < backups/reformyou-DATUM.dump
docker compose start app cron
```

## Update

Neue Version des Ordners einspielen und im selben Ordner:

```
docker compose up -d --build
```

Die Migrationen laufen dabei automatisch. Schemaänderungen kommen immer als neue Datei unter `prisma/migrations`. Nie `prisma db push` gegen die Betriebsdatenbank verwenden. Vor einem Update einen Dump ziehen (`docker compose exec backup pg_dump -Fc -f /backups/vor-update.dump`).

## Zahlung (Stripe)

Die Zahlung läuft über Stripe Checkout (Zahlungsseite bei Stripe, Rückkehr auf die Website). Es gibt drei Zustände, je nach `STRIPE_SECRET_KEY` in der `.env`:

| Schlüssel | Verhalten |
|---|---|
| leer | Simulation ohne Geld und ohne Stripe (gelber Hinweis auf den Seiten) |
| `sk_test_...` | Stripe-Testmodus, Testkarte 4242 4242 4242 4242, kein echtes Geld (gelber Hinweis) |
| `sk_live_...` | Echte Zahlungen, kein Hinweis |

Credits, Buchung oder Gutschein entstehen erst nach der Zahlung. Das passiert genau einmal, egal ob die Rückkehrseite oder der Webhook zuerst kommt. Wird ein Kurs während der Zahlung voll, erstattet das System den Betrag automatisch und informiert Kundin und Studio. Scheitert auch die Erstattung, bekommt das Studio eine Mail und erstattet in Stripe von Hand.

**Webhook einrichten (für den Livegang nötig):**

1. In Stripe unter Entwickler, Webhooks einen Endpunkt anlegen: `https://<domain>/api/stripe/webhook`
2. Ereignisse wählen: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
3. Das Signing-Secret (`whsec_...`) als `STRIPE_WEBHOOK_SECRET` in die `.env`, danach `docker compose up -d`.

Der Webhook sichert den Fall ab, dass eine Kundin nach der Zahlung den Browser schließt. Ohne ihn funktionieren Zahlungen nur, wenn sie auf die Bestätigungsseite zurückkommt.

**Zahlarten:** Stripe zeigt die Zahlarten, die im Dashboard unter Einstellungen, Zahlungsmethoden aktiviert sind. Im Sandbox-Test waren nur Karte, Klarna, eps und Bancontact aktiv. Janina muss **SEPA-Lastschrift, PayPal, Apple Pay und Google Pay** einschalten, in der Sandbox und im Live-Konto getrennt, und nicht gewollte (Klarna, eps, Bancontact) abschalten.

**SEPA:** Die Lastschrift wird erst nach einigen Tagen bestätigt. Das System schaltet Credits und Buchung sofort frei, sobald Stripe die Zahlung als "in Bearbeitung" meldet. Scheitert sie später (Rücklastschrift), schickt der Webhook eine Mail ans Studio mit Kunde und Betrag, die Freischaltung muss dann von Hand im Admin-Bereich korrigiert werden.

**Auf Live umstellen:** Im Live-Konto der Inhaberin den Geheimschlüssel (`sk_live_...`) erzeugen, in die `.env` eintragen, den Webhook im Live-Modus anlegen (eigenes `whsec_...`), `docker compose up -d`, eine Testbuchung mit kleinem Betrag machen und in Stripe erstatten.

Die Schlüssel stehen nur in der `.env`, nie im Quellcode, in Chats oder Tickets.

## Willkommenscode (ein Kurs gratis)

Bei der Erstregistrierung erzeugt das System automatisch einen Code `WK-XXXX-XXXX` und mailt ihn an die Kundin. Er gilt für eine kostenlose Einzelstunde in einem Reformer-Kurs (nicht Mommy & Mini, nicht für Credits), einmal einlösbar, an beiden Standorten. Eingegeben wird er im Bezahlschritt im Feld für Gutscheincodes.

Im Admin-Bereich unter `Einstellungen` lässt sich die automatische Erzeugung ein- und ausschalten und die Gültigkeit in Monaten ändern (Standard 3, gilt für neue Codes). Unter `Codes` erzeugt Janina einen Code von Hand (mit E-Mail wird er gleich verschickt), sieht alle Codes und sperrt offene. Storniert die Kundin rechtzeitig oder fällt der Kurs aus, wird der Code wieder gültig, es entsteht kein Guthaben. Ohne SMTP-Zugang geht die Mail nicht raus, der Code steht dann trotzdem unter `Codes`.

Missbrauchsschutz: Pro Handynummer gibt es höchstens einen automatischen Code (Schreibweisen wie `0170`, `+49 170` und `0049 170` zählen als dieselbe Nummer). Registrierungen mit Wegwerf-E-Mail-Adressen (Liste im Paket `disposable-email-domains`, rund 120.000 Domains) werden abgelehnt. Eine E-Mail-Bestätigung vor dem Code ist noch nicht gebaut.

## Domain von Wix umziehen

1. Vorher beim Wix-Domaineintrag die TTL senken, falls möglich.
2. Die Website von der Domain in Wix trennen.
3. In den DNS-Einstellungen den A-Eintrag für `reform-you.de` und für `www` auf die öffentliche IP der Website setzen.
4. **Die E-Mail-Einträge (MX, SPF, DKIM, DMARC) nicht ändern.** Die Postfächer hängen an der Domain.
5. Danach das Zertifikat prüfen und eine Testbuchung machen.

## Checkliste vor dem Livegang

- [ ] Echter Wochenplan in `prisma/termine.ts`, Termine erzeugt
- [ ] Erster Admin angelegt, Janina hat ein eigenes Passwort, `ADMIN_PASSWORT` geändert
- [ ] SMTP eingetragen, Testmail kommt an
- [ ] HTTPS, `NEXT_PUBLIC_BASE_URL` stimmt
- [ ] Sicherung läuft und wurde einmal wiederhergestellt, Kopie auf ein zweites System
- [ ] Rechtstexte (AGB, Datenschutz, Impressum) eingefügt und geprüft
- [ ] Übernahme der Wix-Credits und Gutscheine zum Jahreswechsel geklärt (Import)
- [ ] Stripe: Live-Schlüssel und Webhook eingetragen, Zahlarten aktiviert, Testbuchung erstattet
- [ ] Auf dem Handy durchgeklickt: Standortwahl, Kursplan, Buchen, Credits, Gutschein

## Bekannte Lücken

- **Terminverwaltung im Admin fehlt**, siehe oben.
- **Kein Schutz gegen wiederholtes Raten von Passwörtern** bei den Logins. Empfehlung: Ratenbegrenzung am Reverse Proxy oder fail2ban.
- **Ohne Datenbank zeigen die Seiten Beispieldaten**, statt einen Fehler zu melden. Deshalb die Überwachung auf `/api/health` legen, nicht auf die Startseite.
- **Rechnungen als PDF, DATEV-Export und SMS bei Kursausfall** sind nicht gebaut. Stripe selbst ist angebunden und mit Test-Zahlungen geprüft.
- Der Docker-Build wurde auf dem Entwicklungsrechner nicht ausgeführt, weil dort kein Docker läuft. Getestet wurden die Migrationen auf einer leeren PostgreSQL-Datenbank, das Seed, die Terminerzeugung, der Produktionsbuild als eigenständiger Server inklusive täglichem Job und die Stripe-Zahlung mit Testkarte (Credits, Einzelstunde mit Teilgutschein, Gutschein-Kauf, volle Kurse mit automatischer Erstattung, Webhook-Signatur). Beim ersten `docker compose up -d --build` bitte auf Fehler im Bauen achten.

## Fehlersuche

| Problem | Nachsehen |
|---|---|
| Seite nicht erreichbar | `docker compose ps`, `docker compose logs -f app` |
| `app` startet nicht | `docker compose logs migrate`, die Migration muss erfolgreich beendet sein |
| `/api/health` meldet 503 | `docker compose logs db`, Passwort in `.env` zur Datenbank passend? Nach einer Passwortänderung `docker compose down -v` löscht auch die Daten, deshalb stattdessen das Passwort in der Datenbank ändern |
| Keine Mails | `docker compose logs app`, SMTP-Werte, SPF und DKIM |
| Keine Gutschein-Codes am Lieferdatum | `docker compose logs cron`, `CRON_SECRET` in `.env` gesetzt? |
| Uhrzeiten falsch | `TZ=Europe/Berlin` ist in der Compose-Datei gesetzt, Termine ohne diese Zeitzone angelegt? |

## Ordnerübersicht

| Pfad | Inhalt |
|---|---|
| `src/` | Website, Buchungslogik, Admin |
| `prisma/schema.prisma` | Datenmodell |
| `prisma/migrations/` | Datenbankstruktur (Baseline vom 05.11.2026) |
| `prisma/seed.ts`, `prisma/termine.ts` | Inhalte und Terminerzeugung |
| `deploy/` | Skripte für Cronjob und Sicherung, Caddy-Konfiguration |
| `Dockerfile`, `docker-compose.yml` | Bau und Betrieb |
| `.env.beispiel` | Vorlage für die Einstellungen |
| `backups/` | Datenbanksicherungen |
