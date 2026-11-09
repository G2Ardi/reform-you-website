-- AlterTable
ALTER TABLE "freikurse" ADD COLUMN     "telefonNorm" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "freikurse_telefonNorm_key" ON "freikurse"("telefonNorm");

