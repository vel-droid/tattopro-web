-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('CONSUMABLE', 'JEWELRY', 'AFTERCARE', 'EQUIPMENT', 'OTHER');

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "category" "InventoryCategory" NOT NULL DEFAULT 'CONSUMABLE';
