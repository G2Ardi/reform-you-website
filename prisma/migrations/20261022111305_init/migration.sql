-- CreateEnum
CREATE TYPE "SkalaArt" AS ENUM ('POSITION', 'OHNE_FEDER');

-- CreateEnum
CREATE TYPE "PreisTyp" AS ENUM ('ABO', 'EINZELSTUNDE', 'GESCHENKKARTE', 'KARTE', 'EVENT');

-- CreateEnum
CREATE TYPE "ProduktTyp" AS ENUM ('ABO', 'EINZELSTUNDE', 'GESCHENKKARTE');

-- CreateEnum
CREATE TYPE "BestellStatus" AS ENUM ('OFFEN', 'BEZAHLT', 'STORNIERT');

-- CreateEnum
CREATE TYPE "KursTerminStatus" AS ENUM ('AKTIV', 'AUSGEFALLEN');

-- CreateEnum
CREATE TYPE "BuchungStatus" AS ENUM ('GEBUCHT', 'WARTELISTE', 'STORNIERT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ZahlungsArt" AS ENUM ('KARTE', 'EINZELZAHLUNG');

-- CreateEnum
CREATE TYPE "KartenTyp" AS ENUM ('FUENFER', 'ZEHNER', 'GUTHABEN');

-- CreateTable
CREATE TABLE "standorte" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktivSeit" TIMESTAMP(3),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standorte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kurse" (
    "id" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dauerMinuten" INTEGER,
    "beschreibung" TEXT NOT NULL,
    "skalaArt" "SkalaArt" NOT NULL DEFAULT 'POSITION',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kurse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abo_modelle" (
    "id" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abo_modelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preise" (
    "id" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "typ" "PreisTyp" NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "betragCent" INTEGER,
    "einheit" TEXT,
    "hinweis" TEXT,
    "offen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "datum" TIMESTAMP(3),
    "startzeit" TEXT,
    "endzeit" TEXT,
    "ort" TEXT,
    "preisCent" INTEGER,
    "wiederkehrend" BOOLEAN NOT NULL DEFAULT true,
    "offenerHinweis" TEXT,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produkte" (
    "id" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "typ" "ProduktTyp" NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "preisCent" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "externerAnbieter" TEXT,
    "externeProduktId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produkte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bestellungen" (
    "id" TEXT NOT NULL,
    "produktId" TEXT NOT NULL,
    "kundeEmail" TEXT NOT NULL,
    "kundeName" TEXT,
    "betragCent" INTEGER,
    "status" "BestellStatus" NOT NULL DEFAULT 'OFFEN',
    "zahlungsanbieter" TEXT,
    "externeZahlungsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bestellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kunden" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "strasse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "agbAkzeptiertAm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kunden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "ablaufDatum" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kurstermine" (
    "id" TEXT NOT NULL,
    "kursId" TEXT NOT NULL,
    "standortId" TEXT NOT NULL,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "kapazitaet" INTEGER NOT NULL,
    "status" "KursTerminStatus" NOT NULL DEFAULT 'AKTIV',
    "trainerName" TEXT,
    "ausgefallenAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kurstermine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buchungen" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "kursTerminId" TEXT NOT NULL,
    "status" "BuchungStatus" NOT NULL DEFAULT 'GEBUCHT',
    "zahlungsart" "ZahlungsArt" NOT NULL,
    "karteId" TEXT,
    "wartelistePosition" INTEGER,
    "warteBenachrichtigtAm" TIMESTAMP(3),
    "warteFristBisAm" TIMESTAMP(3),
    "erinnertAm" TIMESTAMP(3),
    "storniertAm" TIMESTAMP(3),
    "stornoGrund" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buchungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karten" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "typ" "KartenTyp" NOT NULL,
    "einheitenGesamt" INTEGER NOT NULL,
    "einheitenRest" INTEGER NOT NULL,
    "gekauftAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "notiz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einstellungen" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "erinnerungStundenVorher" INTEGER NOT NULL DEFAULT 36,
    "stornoFristStunden" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "einstellungen_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "kurse" ADD CONSTRAINT "kurse_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abo_modelle" ADD CONSTRAINT "abo_modelle_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preise" ADD CONSTRAINT "preise_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produkte" ADD CONSTRAINT "produkte_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellungen" ADD CONSTRAINT "bestellungen_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "produkte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurstermine" ADD CONSTRAINT "kurstermine_kursId_fkey" FOREIGN KEY ("kursId") REFERENCES "kurse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kurstermine" ADD CONSTRAINT "kurstermine_standortId_fkey" FOREIGN KEY ("standortId") REFERENCES "standorte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_kursTerminId_fkey" FOREIGN KEY ("kursTerminId") REFERENCES "kurstermine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_karteId_fkey" FOREIGN KEY ("karteId") REFERENCES "karten"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karten" ADD CONSTRAINT "karten_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "kunden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
