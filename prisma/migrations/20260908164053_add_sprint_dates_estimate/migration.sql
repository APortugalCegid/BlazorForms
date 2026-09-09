-- AlterTable
ALTER TABLE "Form" ADD COLUMN "dataFinal" TEXT;
ALTER TABLE "Form" ADD COLUMN "dataInicial" TEXT;
ALTER TABLE "Form" ADD COLUMN "estimativa" REAL;
ALTER TABLE "Form" ADD COLUMN "sprint" INTEGER;

-- Backfill: suggest an initial estimate (story points) from existing LOC for forms imported before this field existed
UPDATE "Form" SET "estimativa" = ROUND("loc" * 7.0 / 12000, 0) WHERE "estimativa" IS NULL;
