-- CreateEnum
CREATE TYPE "FreikursArt" AS ENUM ('AUTO', 'MANUELL');

-- CreateEnum
CREATE TYPE "FreikursStatus" AS ENUM ('OFFEN', 'EINGELOEST', 'GESPERRT');

-- AlterTable
ALTER TABLE "buchungen" ADD COLUMN     "gratis" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "einstellungen" ADD COLUMN     "willkommenscodeAktiv" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "willkommenscodeMonate" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "freikurse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "art" "FreikursArt" NOT NULL,
    "status" "FreikursStatus" NOT NULL DEFAULT 'OFFEN',
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "kundeId" TEXT,
    "email" TEXT,
    "notiz" TEXT,
    "eingeloestAm" TIMESTAMP(3),
    "buchungId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freikurse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "freikurse_code_key" ON "freikurse"("code");

-- CreateIndex
CREATE INDEX "freikurse_buchungId_idx" ON "freikurse"("buchungId");

