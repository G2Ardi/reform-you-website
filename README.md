# Reform You Pilates Studio, Website (Next.js)

Neue Website für das Reform You Pilates Studio, als Ablösung der bisherigen
Wix-Seite. Next.js mit App Router, TypeScript, Prisma/Postgres und einer
eigenen API-Schicht, die später auch eine native Buchungsapp bedienen kann.

Die Datei `../Reform You Website.md` (eine Ebene über diesem Ordner) ist der
Projekt-Kontext im Obsidian-Vault. Die alten statischen Prototyp-Seiten
(`index.html`, `kurse.html`, usw.) liegen unverändert daneben und dienten als
Inhalts- und Designquelle für dieses Projekt, siehe Abschnitt "Herkunft des
Designsystems" unten.

## Schnellstart

```bash
npm install
npm run dev
```

Öffnet unter `http://localhost:3000`. **Läuft ohne Datenbank**: Ist keine
`DATABASE_URL` gesetzt oder nicht erreichbar, liefern alle Seiten automatisch
die eingebauten Beispieldaten aus `src/lib/mock-data.ts` aus, siehe Abschnitt
"Ohne Datenbank arbeiten". Eine Konsolenmeldung weist einmal darauf hin.

## Lokale Testumgebung: SQLite statt Postgres

**Wichtiger Hinweis, bewusste Abkürzung:** Diese Entwicklungsmaschine hat kein
Docker und kein lokal installiertes Postgres. Damit sofort eine funktionierende
Testumgebung mit echtem Buchungssystem lief, steht `prisma/schema.prisma`
aktuell auf:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

mit `DATABASE_URL="file:./dev.db"` in `.env`. Das ist **nur für die lokale
Entwicklung**. Für den Produktivbetrieb MUSS das zurückgestellt werden auf:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

mit einer echten `DATABASE_URL` (z. B. [Neon](https://neon.tech) oder ein
eigener Postgres-Server). Nach der Umstellung einmal `npx prisma migrate dev`
laufen lassen, damit eine neue, zu Postgres passende Migration entsteht
(die aktuelle SQLite-Migration unter `prisma/migrations/` lässt sich danach
löschen oder archivieren).

## Mit der Datenbank arbeiten

1. `.env.example` nach `.env` kopieren, Werte eintragen (siehe Abschnitt
   "Umgebungsvariablen" weiter unten für alle Variablen des Buchungssystems).
2. Schema anwenden und Beispieldaten einspielen:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
3. `npm run dev` neu starten.

`npm run db:seed` füllt die Datenbank mit:

- den vier echten Kursformaten (Reformer Basics, Reformer Flow, Reformer
  Cardio/Jumpboard, Pilates x Mommy & Mini) an **beiden** Standorten, aus
  `src/lib/content/standorte-content.ts`,
- rund 40 Kursterminen für die kommenden drei Wochen an beiden Standorten,
  zu unterschiedlichen Uhrzeiten,
- einem Testkundenkonto mit einer bereits angebrochenen 10er-Karte,
- den Standard-Einstellungswerten (Erinnerung 36 Stunden, Stornofrist 24
  Stunden vorher).

Alle fehlenden oder unbestätigten Preise und Konditionen stehen bewusst als
`offen: true` / `null` bzw. über die `Flag`-Komponente markiert, nicht
erfunden.

## Ohne Datenbank arbeiten

Dieses Projekt wurde ohne laufende Postgres-Instanz gebaut (siehe Auftrag).
Damit weder `npm run dev` noch `npm run build` daran scheitern, hat jede
Funktion in `src/lib/repositories/*.ts` einen eingebauten Fallback:

1. Sie versucht zuerst eine echte Prisma-Abfrage.
2. Schlägt die fehl (keine `DATABASE_URL`, falsche Zugangsdaten, DB nicht
   erreichbar), fängt sie den Fehler ab, loggt einmal pro Prozess eine
   Warnung und liefert stattdessen die Beispieldaten aus
   `src/lib/mock-data.ts` zurück, in exakt derselben Form, die Prisma mit den
   passenden `include`-Optionen liefern würde.

Jede Standort-Seite ist zusätzlich mit `export const dynamic = "force-dynamic"`
markiert. Dadurch versucht Next.js nie, diese Seiten beim Build statisch mit
Datenbankdaten vorzurendern, sie werden erst bei echten Anfragen ausgewertet.
Das Zusammenspiel aus beidem hält `npm run build` fehlerfrei durchlaufend,
unabhängig davon, ob eine Datenbank existiert, und sorgt gleichzeitig dafür,
dass eine echte Datenbank später ohne Codeänderung sofort genutzt wird.

Die Konsolenausgaben `prisma:error ... Environment variable not found:
DATABASE_URL` während `npm run build` sind unter diesen Umständen **erwartet
und harmlos**: `generateStaticParams` in `src/app/[standort]/layout.tsx`
versucht beim Build einmal, die Standort-Slugs zu laden, bekommt den
Prisma-Fehler, fängt ihn ab und nutzt die Beispieldaten. Mit gesetzter
`DATABASE_URL` verschwinden diese Zeilen.

## Architektur

```
src/
  app/
    page.tsx                  Standortauswahl (Startseite "/")
    [standort]/
      layout.tsx               Prüft den Standort-Slug, bindet Footer ein
      page.tsx                 Start: Hero, Federskala-Ausschnitt, Reformer-
                                Erklärung, erster Termin, Abo-Teaser, Event
      kurse/page.tsx            Federskala vollständig (gepinnt), Einzelkurse, Event
      abo/page.tsx               Abo-Modell, Geschenkkarte, Einzeltermine
      studio/page.tsx            Janina, Unterscheidungsmerkmale, Community
      kontakt/page.tsx           Adresse, Telefon, Mail, Anfahrt
      impressum/page.tsx         Impressum
      agb/page.tsx                AGB
    api/v1/standorte/...        Dünne API-Schicht, siehe unten
  components/                  Header, Footer, FederSkala, Reveal, FigurePlaceholder, ...
  lib/
    content/standorte-content.ts  Einzige Quelle für alle echten Inhalte
    mock-data.ts                  Offline-Fallback, aus obiger Datei gebaut
    repositories/                 Datenzugriffsschicht (Prisma + Fallback)
    prisma.ts, gsap.ts, format.ts, standort-cookie.ts
prisma/
  schema.prisma                 Datenmodell
  seed.ts                        Füllt die DB aus standorte-content.ts
```

### Zwei Standorte, eine Codebasis

Ab dem 1. Januar 2027 betreibt Reform You die Standorte Wassenberg und
Wegberg. Die komplette Seite liegt deshalb unter der dynamischen Route
`/[standort]/...`, mit `standort` als Slug (`wassenberg`, `wegberg`). Jeder
Kurs, jedes Abo-Modell, jeder Preis und jedes Event hängt im Datenmodell an
einem `Standort`, nie global.

Die Startseite `/` zeigt die Standortauswahl: zwei gleich große Flächen,
keine Dropdown-Liste. Ein Klick merkt den Standort per Cookie
(`src/lib/standort-cookie.ts`, ein Jahr gültig) und leitet weiter. Besucht
jemand `/` erneut, leitet die Seite anhand des Cookies automatisch zum
zuletzt gewählten Standort weiter (`src/app/page.tsx`). Der Link "Standort
wechseln" im Kopfbereich jeder Innenseite führt über `/?wahl=1` gezielt
zurück zur Auswahl, auch mit gesetztem Cookie.

Wegberg hat heute keine echten Inhalte. Statt leere Listen zu zeigen, prüfen
alle Seiten die Datenmenge (`standort.kurse.length > 0` usw.) und zeigen für
Wegberg stattdessen den Hinweis "Kurse folgen" aus
`standorte-content.ts`. Sobald Janina echte Daten für Wegberg liefert,
reicht ein Eintrag dort (oder ein Datensatz in der Datenbank), kein
Seiten-Code ändert sich.

### API-Schicht

`src/app/api/v1/standorte/...` sind dünne Wrapper um die Funktionen in
`src/lib/repositories/`. Sie existieren, weil später eine native
Buchungsapp (Play Store, App Store, siehe Auftrag) dieselbe Datenbasis
nutzen soll, ohne dass App und Website getrennte Datenzugriffe pflegen.
Endpunkte:

- `GET /api/v1/standorte`
- `GET /api/v1/standorte/:slug`
- `GET /api/v1/standorte/:slug/kurse`
- `GET /api/v1/standorte/:slug/abos`
- `GET /api/v1/standorte/:slug/preise`
- `GET /api/v1/standorte/:slug/events`
- `GET /api/v1/standorte/:slug/produkte` (Shop-Vorbereitung)

### Shop-Vorbereitung

Die Modelle `Produkt` und `Bestellung` in `prisma/schema.prisma` bereiten
einen Shop für Abos, Einzelstunden und Geschenkkarten vor, ohne einen
Zahlungsanbieter fest zu verdrahten. `Produkt.externerAnbieter` und
`Produkt.externeProduktId` bleiben leer, bis z. B. Stripe angebunden wird;
`Bestellung.zahlungsanbieter` ebenso. Ein Checkout-Flow fehlt bewusst noch,
die Architektur ist aber so geschnitten, dass er an `getProdukteByStandort`
(`src/lib/repositories/produkte.ts`) andocken kann.

### Bildflächen

Es wurden **keine KI-Bilder erzeugt** (auf dieser Maschine nicht verfügbar,
und ausdrücklich nicht gewünscht). Jede Bildfläche ist stattdessen eine
markenfarbene, exakt in der Zielgröße reservierte Platzhalterfläche mit
Hinweistext, über `src/components/FigurePlaceholder.tsx` (Innenseiten) bzw.
`src/components/HeroImage.tsx` (Hero). Ein echtes Foto einsetzen:

```tsx
<FigurePlaceholder ratio="1610" hint="..." src="/bilder/studio.webp" alt="..." />
```

Sobald `src` gesetzt ist, rendert die Komponente automatisch ein
`next/image` mit Lazy Loading und reservierter Größe (kein Layoutsprung),
ohne dass der umgebende Seiten-Code sich ändert. Bilder vorher als WebP oder
AVIF exportieren und unter `public/` ablegen.

### Bewegung (GSAP)

- `src/components/Reveal.tsx`: normales Scroll-Reveal für alle Abschnitte
  (8–16px y-Versatz, 300–500ms, `power2.out`, triggert nur einmal).
- `src/components/FederSkala.tsx` mit `pinned`: das Signaturmoment auf der
  Kurse-Seite. Gepinnter, scrub-gebundener Abschnitt (scrub 0.8): die Achse
  zieht sich auf, danach fahren die Punkte von links an ihre Position. Auf
  der Startseite läuft dieselbe Komponente ohne `pinned` als normales
  Reveal, damit insgesamt nur ein gepinnter Abschnitt auf der ganzen Seite
  steht.
- `src/components/MotionSetup.tsx`: ruft `ScrollTrigger.refresh()` auf,
  sobald `document.fonts.ready` erfüllt ist, damit sich die Pin-Höhe nicht
  durch nachladende Schrift verschiebt.
- `prefers-reduced-motion`: GSAP registriert die Scroll-Animationen nur
  innerhalb von `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", ...)`.
  Bei reduzierter Bewegung läuft dieser Zweig nie, und die CSS-Regel, die
  Abschnitte vor dem Einblenden versteckt (`globals.css`, `.js .reveal`),
  gilt ebenfalls nur unter `prefers-reduced-motion: no-preference`. Ohne
  JavaScript (die Klasse `js` wird erst per Inline-Script in `layout.tsx`
  gesetzt) bleibt dadurch alles von Anfang an sichtbar.

### Herkunft des Designsystems

Farben, Schriftpaarung und die Federskala als Signaturmotiv stammen aus der
bereits bestehenden statischen Fassung 2 (`../index.html`, `../assets/site.css`
usw.), die wiederum aus dem echten Logo und der echten Bestandsseite
reform-you.de ausgelesen wurden, nicht aus einer generischen
KI-Stimmungssammlung. `src/app/globals.css` ist die Next.js-Portierung dieses
Designsystems. Details und die Begründung, warum die erste Fassung generisch
wirkte und verworfen wurde, stehen in `../Reform You Website.md`.

## Buchungssystem

Echtes Buchungssystem mit Kundenkonten, Kalender, Guthabenkarten,
E-Mail-Benachrichtigungen und Admin-Bereich, zusätzlich zur bestehenden
Marketing-Website. Datenmodell in `prisma/schema.prisma`
(Kunde/Session/KursTermin/Buchung/Karte/Einstellung), Geschäftslogik in
`src/lib/repositories/buchungen.ts`, `karten.ts`, `kurstermine.ts`,
`einstellungen.ts`, `kunden.ts`. Server Actions für Formulare liegen in
`src/lib/actions/`.

### Testkundenkonto

Von `npm run db:seed` angelegt, mit bereits angebrochener 10er-Karte (7 von
10 Einheiten übrig), damit sofort eine Buchung mit Kartenabzug ausprobiert
werden kann:

- E-Mail: `test@reform-you.de`
- Passwort: `test1234`

### Buchung durchklicken, Schritt für Schritt

1. `npm run dev` starten, `http://localhost:3000` öffnen.
2. Standort wählen, z. B. "Wassenberg" (oder direkt `/wassenberg` aufrufen).
3. Im Kopfbereich auf "Mein Konto" klicken, dann auf "Login" (oder direkt
   `/wassenberg/konto/login` aufrufen).
4. Einloggen mit `test@reform-you.de` / `test1234`.
5. Im Kopfbereich auf "Termin buchen" klicken (oder `/wassenberg/buchen`
   aufrufen). Es erscheint eine nach Tag gruppierte Liste aller kommenden
   Kurstermine mit freien Plätzen.
6. Bei einem Reformer-Termin (Reformer Basics/Flow/Cardio) im Dropdown
   "Zahlung" die Option "Mit Karte bezahlen" auswählen, die bereits
   angebrochene 10er-Karte ist vorausgewählt.
7. Auf "Buchen" klicken. Es erscheint "Buchung bestätigt, Sie erhalten
   gleich eine E-Mail." Ohne hinterlegte SMTP-Zugangsdaten erscheint
   stattdessen eine Konsolenzeile im Terminal, die den übersprungenen
   Mailversand protokolliert, siehe Abschnitt "Ohne Datenbank arbeiten".
8. Auf "Mein Konto" / `/wassenberg/konto/profil` gehen: Die Karte zeigt jetzt
   6 statt 7 Resteinheiten, die neue Buchung erscheint in der Liste mit
   Status "gebucht" und einem "Stornieren"-Knopf sowie einer Umbuchen-Auswahl
   (solange die Stornofrist von 24 Stunden vor Kursbeginn noch nicht
   abgelaufen ist).
9. Zum Test der Stornierung auf "Stornieren" klicken und bestätigen: Status
   wechselt zu "storniert", die Karte bekommt die Einheit zurück.
10. Zum Test von Terminen ohne Login: ausloggen und `/wassenberg/buchen`
    erneut aufrufen, dort erscheint statt des Buchungsformulars ein
    Login-Link.

### Umgebungsvariablen des Buchungssystems

Zusätzlich zu `DATABASE_URL` (siehe oben):

| Variable | Zweck |
|---|---|
| `ADMIN_PASSWORT` | Gemeinsames Passwort für den Admin-Bereich unter `/admin`. Einfacher Platzhalter-Schutz, kein echtes Rollensystem, nicht produktionsreif. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | SMTP-Zugangsdaten für nodemailer. Fehlen sie, wird der Mailversand übersprungen und verständlich geloggt, nichts crasht. |
| `SMTP_FROM` | Absenderadresse/-name, z. B. `"Janina von Reform You <buchung@reform-you.de>"`. |
| `STUDIO_BENACHRICHTIGUNG_EMAIL` | Erhält bei jeder Stornierung eine interne Benachrichtigung. |
| `TOKEN_SECRET` | Signiert die Aktions-Links in E-Mails (Stornieren/Umbuchen/Warteliste bestätigen ohne Login). In Produktion durch einen eigenen Zufallswert ersetzen. |

### Admin-Bereich

Unter `/admin/login` mit `ADMIN_PASSWORT` einloggen. Enthält:

- `/admin` – kommende Termine mit Teilnehmerzahl, Link zu Details
- `/admin/termine/[id]` – Teilnehmerliste, No-Show markieren, Kurs ausfallen
  lassen (automatische Gutschrift + Mail an alle), Kulanz-Storno trotz
  abgelaufener Frist
- `/admin/einstellungen` – Erinnerungsstunden und Stornofrist ändern, nicht
  hart codiert
- `/admin/erinnerungen` – manueller Versand-Knopf, siehe nächster Abschnitt
- `/admin/kulanz` – Freitext-Werkzeug, um einem Kunden per E-Mail eine
  Einheit, mehrere Einheiten oder eine ganze Karte gutzuschreiben

### Erinnerungsmails ohne echten Cronjob

Es gibt noch keinen Scheduler. `/admin/erinnerungen` stößt den Versand für
alle Buchungen an, die innerhalb der eingestellten `erinnerungStundenVorher`
Stunden beginnen und noch keine Erinnerung erhalten haben
(`src/lib/repositories/buchungen.ts`, `versendeFaelligeErinnerungen`). In
Produktion diesen Button durch einen echten Cronjob ersetzen, der dieselbe
Aktion regelmäßig auslöst, z. B.:

- **Vercel Cron**: eine Route-Handler-Variante der Admin-Aktion unter
  `/api/cron/erinnerungen` anlegen, in `vercel.json` einen `crons`-Eintrag
  z. B. alle 30 Minuten eintragen.
- **Eigener Server**: ein `cron`-Job (Linux) oder die Windows-Aufgaben­planung,
  der/die regelmäßig `curl` gegen eine entsprechend abgesicherte Route
  aufruft.

Die Warteliste prüft ihre eigene 30-Minuten-Reaktionsfrist ähnlich "lazy"
statt per Cronjob: bei jedem Aufruf der `/buchen`-Seite eines Standorts wird
`pruefeWartelisteAblauf` für die sichtbaren Termine ausgeführt und rückt bei
abgelaufener Frist automatisch die nächste Person nach. Zusätzlich lässt sich
über den "Kulanz-Storno"- bzw. "Kurs ausfallen lassen"-Knopf im Admin-Bereich
jederzeit manuell nachsteuern.

### Guthabenkarten

5er-Karte (120€, 3 Monate) und 10er-Karte (220€, 6 Monate), siehe
`src/lib/repositories/karten.ts` (`KARTEN_KATALOG`). Karten gehören dem
Kunden, nicht einem Standort (`Karte.kundeId`, kein `standortId`), und sind
damit an beiden Standorten einlösbar. Eine Stornierung einer Einzelzahlung
(nicht mit Karte bezahlt) erzeugt automatisch eine `GUTHABEN`-Karte mit einer
Einheit statt einer Geldrückerstattung, genauso bei Kursausfall durch das
Studio.

### Mehrwertsteuer-Umschaltung

`src/lib/mwst.ts` liefert anhand des Datums den passenden Hinweistext (0%
Kleinunternehmerregelung bis 31.12.2026, 19% ab 1.1.2027) und wird überall
genutzt, wo ein Preis angezeigt wird.

### Offene/unbestätigte Punkte im Buchungssystem

Sichtbar über die `Flag`-Komponente markiert, nicht stillschweigend
angenommen:

- **Dauer der drei Reformer-Formate**: nicht von Janina bestätigt, 50 Minuten
  als Annahme übernommen (bisheriger Wert).
- **Kapazität von Pilates x Mommy & Mini**: 6 Plätze als Platzhalter
  übernommen, nicht bestätigt (für die Reformer-Kurse sind 6 Plätze dagegen
  bestätigt).
- **Ob die 5er-/10er-Karte auch für Pilates x Mommy & Mini gilt**: Janina
  sprach nur von "Reformer Kursen", deshalb aktuell `karteGueltig: false` für
  diesen Kurs, aber nicht zu hundert Prozent sicher.
- **Pausieren einer Karte**: nicht vorgesehen, aber auch nicht ausdrücklich
  ausgeschlossen, nicht bestätigt.

### Ausdrücklich nicht gebaut

Wie im Auftrag festgelegt: keine echte Zahlungsanbindung (Stripe/PayPal/
SumUp), keine Gutschein- oder Events-Seiten, keine native App, keine
Rechnungsstellung/DATEV-Export.

## Was noch fehlt (manuell, nicht technisch)

- **Produktivdatenbank**: Siehe Abschnitt "Lokale Testumgebung: SQLite statt
  Postgres" oben, vor dem echten Go-Live unbedingt auf Postgres umstellen.
- **Echte SMTP-Zugangsdaten** für den Mailversand, siehe Umgebungsvariablen.
- **Echtes Admin-Rollensystem**: aktuell ein einzelnes gemeinsames Passwort,
  kein einzelnes Konto für Janina oder Mitarbeitende.
- **Echter Cronjob** für Erinnerungsmails statt des manuellen Admin-Knopfs.
- **Echte Fotos** statt der markenfarbenen Platzhalterflächen, siehe Liste
  im Auftrag (Hero, Reformer, Studioraum, Reformer-Reihe, Janina, Paint &
  Wine, je ein Bild für die Standortauswahl).
- **Wegberg-Kontaktdaten**: Telefon und Mail stehen noch nicht fest (Adresse
  ist bereits von Janina bestätigt).
- **Drei bis fünf Sätze von Janina** über sich (Studio-Seite), aktuell als
  Platzhalter markiert.
- **Rechtstexte**: AGB-Volltext von der alten Seite übernehmen,
  Datenschutzerklärung, Handelsregisternummer der Myfairtrieb
  Vertriebsgesellschaft mbH.
- **Wertgutschein und Grip Socks im Online-Shop**: Die Produkt-/
  Bestellung-Modelle sind vorbereitet (siehe Abschnitt
  "Shop-Vorbereitung"), der Kaufvorgang selbst ist bewusst nicht Teil
  dieses Auftrags.
- **Zahlungsanbieter** für den vorbereiteten Shop (z. B. Stripe) ist bewusst
  noch nicht angebunden.

## Build prüfen

```bash
npm run lint
npm run build
```

Beides wurde vor Abgabe erfolgreich durchlaufen (siehe Abschlussbericht).
