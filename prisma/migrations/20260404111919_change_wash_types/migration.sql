/*
  Warnings:

  - Made the column `description` on table `wash_types` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "wash_types" ALTER COLUMN "description" SET NOT NULL;
