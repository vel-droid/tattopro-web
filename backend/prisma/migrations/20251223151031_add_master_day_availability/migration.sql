-- CreateTable
CREATE TABLE "MasterDayAvailability" (
    "id" SERIAL NOT NULL,
    "masterId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDayAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterDayAvailability_masterId_date_key" ON "MasterDayAvailability"("masterId", "date");

-- AddForeignKey
ALTER TABLE "MasterDayAvailability" ADD CONSTRAINT "MasterDayAvailability_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
