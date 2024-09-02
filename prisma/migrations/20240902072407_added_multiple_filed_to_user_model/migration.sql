/*
  Warnings:

  - You are about to drop the column `secret` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorAuth` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "secret",
DROP COLUMN "twoFactorAuth",
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "towFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT,
ALTER COLUMN "verificationToken" DROP NOT NULL;
