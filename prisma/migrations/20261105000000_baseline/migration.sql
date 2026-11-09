-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
CREATE TYPE "BuchungStatus" AS ENUM ('GEBUCHT', 'WARTELISTE', 'STORNIERT', 'NO_SHOW', 'ANWESEND');

-- CreateEnum
CREATE TYPE "ZahlungsArt" AS ENUM ('KARTE', 'EINZELZAHLUNG');

-- CreateEnum
CREATE TYPE "KartenTyp" AS ENUM ('FUENFER', 'ZEHNER', 'GUTHABEN');

-- CreateEnum
CREATE TYPE "GutscheinStatus" AS ENUM ('GEPLANT', 'VERSENDET');

-- CreateEnum
CREATE TYPE "ZahlungsZweck" AS ENUM ('EINZELSTUNDE', 'CREDITS', 'GUTSCHEIN');

-- CreateEnum
CREATE TYPE "MitarbeiterRolle" AS ENUM ('ADMIN', 'TRAINER');

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
CREATE TABLE "gutscheine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "betragCent" INTEGER NOT NULL,
    "restCent" INTEGER NOT NULL,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "status" "GutscheinStatus" NOT NULL DEFAULT 'GEPLANT',
    "kaeuferName" TEXT NOT NULL,
    "kaeuferEmail" TEXT NOT NULL,
    "empfaengerName" TEXT NOT NULL,
    "empfaengerEmail" TEXT NOT NULL,
    "nachricht" TEXT,
    "lieferDatum" TIMESTAMP(3) NOT NULL,
    "versandtAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gutscheine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zahlungen" (
    "id" TEXT NOT NULL,
    "zweck" "ZahlungsZweck" NOT NULL,
    "betragCent" INTEGER NOT NULL,
    "anbieter" TEXT NOT NULL DEFAULT 'TEST',
    "bezug" TEXT,
    "standortId" TEXT,
    "kundeId" TEXT,
    "buchungId" TEXT,
    "gutscheinId" TEXT,
    "gutscheinAbzugCent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zahlungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitarbeiter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "rolle" "MitarbeiterRolle" NOT NULL,
    "darfUmsaetzeSehen" BOOLEAN NOT NULL DEFAULT false,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mitarbeiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitarbeiter_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "ablaufDatum" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mitarbeiter_sessions_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "gutscheine_code_key" ON "gutscheine"("code");

-- CreateIndex
CREATE INDEX "zahlungen_createdAt_idx" ON "zahlungen"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mitarbeiter_email_key" ON "mitarbeiter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mitarbeiter_sessions_token_key" ON "mitarbeiter_sessions"("token");

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

-- AddForeignKey
ALTER TABLE "zahlungen" ADD CONSTRAINT "zahlungen_gutscheinId_fkey" FOREIGN KEY ("gutscheinId") REFERENCES "gutscheine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitarbeiter_sessions" ADD CONSTRAINT "mitarbeiter_sessions_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "mitarbeiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

