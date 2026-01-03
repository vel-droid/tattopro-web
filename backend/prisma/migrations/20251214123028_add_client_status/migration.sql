-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('REGULAR', 'VIP', 'RISK');

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'REGULAR',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Master" ALTER COLUMN "updatedAt" DROP DEFAULT;
