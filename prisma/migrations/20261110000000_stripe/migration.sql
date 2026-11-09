-- CreateEnum
CREATE TYPE "StripeArt" AS ENUM ('CREDITS', 'EINZELSTUNDE', 'GUTSCHEIN');

-- CreateEnum
CREATE TYPE "StripeStatus" AS ENUM ('OFFEN', 'IN_ARBEIT', 'BEZAHLT', 'ERSTATTET', 'FEHLGESCHLAGEN', 'MANUELL');

-- AlterTable
ALTER TABLE "zahlungen" ADD COLUMN     "externeId" TEXT;

-- CreateTable
CREATE TABLE "stripe_bestellungen" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "art" "StripeArt" NOT NULL,
    "status" "StripeStatus" NOT NULL DEFAULT 'OFFEN',
    "kundeId" TEXT,
    "standortSlug" TEXT NOT NULL,
    "gesamtCent" INTEGER NOT NULL,
    "betragCent" INTEGER NOT NULL,
    "gutscheinCode" TEXT,
    "gutscheinAbzugCent" INTEGER NOT NULL DEFAULT 0,
    "daten" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "fehler" TEXT,
    "ergebnis" TEXT,
    "erfuelltAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_bestellungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_bestellungen_sessionId_key" ON "stripe_bestellungen"("sessionId");

-- CreateIndex
CREATE INDEX "stripe_bestellungen_kundeId_idx" ON "stripe_bestellungen"("kundeId");

