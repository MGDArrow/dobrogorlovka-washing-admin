/*
  Warnings:

  - Added the required column `dryingSpin` to the `wash_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temperature` to the `wash_types` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "wash_types" ADD COLUMN     "dryingSpin" INTEGER NOT NULL,
ADD COLUMN     "temperature" INTEGER NOT NULL;
