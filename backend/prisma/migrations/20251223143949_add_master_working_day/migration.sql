-- CreateTable
CREATE TABLE "MasterWorkingDay" (
    "id" SERIAL NOT NULL,
    "masterId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterWorkingDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterWorkingDay_masterId_weekday_key" ON "MasterWorkingDay"("masterId", "weekday");

-- AddForeignKey
ALTER TABLE "MasterWorkingDay" ADD CONSTRAINT "MasterWorkingDay_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
