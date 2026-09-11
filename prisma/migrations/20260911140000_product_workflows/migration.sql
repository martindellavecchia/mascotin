-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SEARCH_DIGEST';
ALTER TYPE "NotificationType" ADD VALUE 'MEETUP';

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "schedule" JSONB;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "durationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "swipeSequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Swipe" ADD COLUMN     "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "actionSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "undoneAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Appointment" a SET "durationMinutes" = s."duration" FROM "Service" s WHERE s.id = a."serviceId";
UPDATE "Swipe" SET "actedAt" = "createdAt";
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "fromPetId" ORDER BY "createdAt", id) AS sequence
  FROM "Swipe" WHERE "fromPetId" IS NOT NULL
)
UPDATE "Swipe" s SET "actionSequence" = ordered.sequence FROM ordered WHERE ordered.id = s.id;
UPDATE "Pet" p SET "swipeSequence" = latest.sequence
FROM (SELECT "fromPetId", MAX("actionSequence") AS sequence FROM "Swipe" GROUP BY "fromPetId") latest WHERE latest."fromPetId" = p.id;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_duration_positive" CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "syntheticRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meetup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSearch_userId_enabled_idx" ON "SavedSearch"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SearchDelivery_userId_kind_entityId_key" ON "SearchDelivery"("userId", "kind", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchDigest_userId_day_key" ON "SearchDigest"("userId", "day");

-- CreateIndex
CREATE INDEX "ProductEvent_name_syntheticRunId_createdAt_idx" ON "ProductEvent"("name", "syntheticRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductEvent_userId_name_entityKey_key" ON "ProductEvent"("userId", "name", "entityKey");

-- CreateIndex
CREATE INDEX "AppointmentEvent_appointmentId_createdAt_idx" ON "AppointmentEvent"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "Meetup_matchId_createdAt_idx" ON "Meetup"("matchId", "createdAt");

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchDelivery" ADD CONSTRAINT "SearchDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchDigest" ADD CONSTRAINT "SearchDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meetup" ADD CONSTRAINT "Meetup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
