-- CreateTable
CREATE TABLE "standorte" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktivSeit" DATETIME,
    "strasse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "oeffnungszeiten" TEXT,
    "oeffnungszeitenOffen" BOOLEAN NOT NULL DEFAULT true,
    "parkhinweis" TEXT,
    "parkhinweisOffen" BOOLEAN NOT NULL DEFAULT true,
    "gruppengroesse" TEXT,
    "gruppengroesseOffen" BOOLEAN NOT NULL DEFAULT true,
    "hinweis" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "kurse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standortId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dauerMinuten" INTEGER,
    "beschreibung" TEXT NOT NULL,
    "skalaArt" TEXT NOT NULL DEFAULT 'POSITION',
    "skalaPosition" INTEGER,
    "skalaLabel" TEXT,
    "hinweis" TEXT,
    "offenerHinweis" TEXT,
    "preisEinzelCent" INTEGER NOT NULL,
    "karteGueltig" BOOLEAN NOT NULL DEFAULT true,
    "karteGueltigOffen" BOOLEAN NOT NULL DEFAULT false,
    "kapazitaetStandard" INTEGER NOT NULL DEFAULT 6,
    "kapazitaetOffen" BOOLEAN NOT NULL DEFAULT false,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kurse_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "abo_modelle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standortId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "abo_modelle_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "preise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standortId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "betragCent" INTEGER,
    "einheit" TEXT,
    "hinweis" TEXT,
    "offen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "preise_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standortId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "datum" DATETIME,
    "startzeit" TEXT,
    "endzeit" TEXT,
    "ort" TEXT,
    "preisCent" INTEGER,
    "wiederkehrend" BOOLEAN NOT NULL DEFAULT true,
    "offenerHinweis" TEXT,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "events_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "produkte" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "standortId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "preisCent" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "externerAnbieter" TEXT,
    "externeProduktId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "produkte_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bestellungen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produktId" TEXT NOT NULL,
    "kundeEmail" TEXT NOT NULL,
    "kundeName" TEXT,
    "betragCent" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "zahlungsanbieter" TEXT,
    "externeZahlungsId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bestellungen_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "produkte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kunden" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "strasse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "agbAkzeptiertAm" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "ablaufDatum" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kurstermine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kursId" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "beginn" DATETIME NOT NULL,
    "ende" DATETIME NOT NULL,
    "kapazitaet" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIV',
    "trainerName" TEXT,
    "ausgefallenAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kurstermine_kursId_fkey" FOREIGN KEY ("kursId") REFERENCES "kurse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "kurstermine_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "buchungen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kundeId" TEXT NOT NULL,
    "kursTerminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GEBUCHT',
    "zahlungsart" TEXT NOT NULL,
    "karteId" TEXT,
    "wartelistePosition" INTEGER,
    "warteBenachrichtigtAm" DATETIME,
    "warteFristBisAm" DATETIME,
    "erinnertAm" DATETIME,
    "storniertAm" DATETIME,
    "stornoGrund" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "buchungen_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "buchungen_kursTerminId_fkey" FOREIGN KEY ("kursTerminId") REFERENCES "kurstermine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "buchungen_karteId_fkey" FOREIGN KEY ("karteId") REFERENCES "karten" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "karten" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kundeId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "einheitenGesamt" INTEGER NOT NULL,
    "einheitenRest" INTEGER NOT NULL,
    "gekauftAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gueltigBis" DATETIME NOT NULL,
    "notiz" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "karten_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "einstellungen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "erinnerungStundenVorher" INTEGER NOT NULL DEFAULT 36,
    "stornoFristStunden" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "standorte_slug_key" ON "standorte"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "kurse_standortId_slug_key" ON "kurse"("standortId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_standortId_slug_key" ON "events"("standortId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "kunden_email_key" ON "kunden"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
