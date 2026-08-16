-- CreateEnum
CREATE TYPE "FosterProfileStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RescueCaseStatus" AS ENUM ('SEARCHING', 'INTERESTED', 'COORDINATING', 'IN_FOSTER', 'RESOLVED', 'NEEDS_ADOPTION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RescueUrgency" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FosterOfferStatus" AS ENUM ('PENDING', 'INTERESTED', 'DECLINED', 'SELECTED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FosterPlacementStatus" AS ENUM ('COORDINATING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FOSTER_OFFER';
ALTER TYPE "NotificationType" ADD VALUE 'FOSTER_RESPONSE';
ALTER TYPE "NotificationType" ADD VALUE 'FOSTER_PLACEMENT';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fosterPlacementId" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "notifyFoster" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FosterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "FosterProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptsSpecies" TEXT NOT NULL DEFAULT '[]',
    "acceptsSizes" TEXT NOT NULL DEFAULT '[]',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "occupiedSlots" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "maxDurationDays" INTEGER NOT NULL DEFAULT 30,
    "housingType" TEXT NOT NULL,
    "hasYard" BOOLEAN NOT NULL DEFAULT false,
    "hasKids" BOOLEAN NOT NULL DEFAULT false,
    "hasOtherPets" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT NOT NULL,
    "notes" TEXT,
    "adultDeclaredAt" TIMESTAMP(3) NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueCase" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "petId" TEXT,
    "status" "RescueCaseStatus" NOT NULL DEFAULT 'SEARCHING',
    "species" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "urgency" "RescueUrgency" NOT NULL DEFAULT 'NORMAL',
    "apparentCondition" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "searchRadiusKm" INTEGER NOT NULL DEFAULT 5,
    "requestedDays" INTEGER NOT NULL DEFAULT 14,
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescueCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FosterOffer" (
    "id" TEXT NOT NULL,
    "rescueCaseId" TEXT NOT NULL,
    "fosterProfileId" TEXT NOT NULL,
    "status" "FosterOfferStatus" NOT NULL DEFAULT 'PENDING',
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FosterPlacement" (
    "id" TEXT NOT NULL,
    "rescueCaseId" TEXT NOT NULL,
    "fosterProfileId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "status" "FosterPlacementStatus" NOT NULL DEFAULT 'COORDINATING',
    "requesterConfirmedAt" TIMESTAMP(3),
    "fosterConfirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "expectedEndAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FosterPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "RescueCaseStatus",
    "toStatus" "RescueCaseStatus",
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RescueCaseEvent_pkey" PRIMARY KEY ("id")
);

-- Keep capacity and radius rules valid even for writes outside the application.
ALTER TABLE "FosterProfile"
    ADD CONSTRAINT "FosterProfile_capacity_check" CHECK ("capacity" BETWEEN 1 AND 5),
    ADD CONSTRAINT "FosterProfile_occupiedSlots_check" CHECK ("occupiedSlots" >= 0 AND "occupiedSlots" <= "capacity"),
    ADD CONSTRAINT "FosterProfile_maxDurationDays_check" CHECK ("maxDurationDays" BETWEEN 1 AND 90);

ALTER TABLE "RescueCase"
    ADD CONSTRAINT "RescueCase_searchRadiusKm_check" CHECK ("searchRadiusKm" BETWEEN 1 AND 50),
    ADD CONSTRAINT "RescueCase_requestedDays_check" CHECK ("requestedDays" BETWEEN 1 AND 90);

-- CreateIndex
CREATE UNIQUE INDEX "FosterProfile_userId_key" ON "FosterProfile"("userId");

-- CreateIndex
CREATE INDEX "FosterProfile_status_idx" ON "FosterProfile"("status");

-- CreateIndex
CREATE INDEX "FosterProfile_latitude_longitude_idx" ON "FosterProfile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "RescueCase_createdByUserId_status_createdAt_idx" ON "RescueCase"("createdByUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RescueCase_status_createdAt_idx" ON "RescueCase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RescueCase_latitude_longitude_idx" ON "RescueCase"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "FosterOffer_fosterProfileId_status_createdAt_idx" ON "FosterOffer"("fosterProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FosterOffer_rescueCaseId_status_idx" ON "FosterOffer"("rescueCaseId", "status");

-- CreateIndex
CREATE INDEX "FosterOffer_expiresAt_idx" ON "FosterOffer"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FosterOffer_rescueCaseId_fosterProfileId_key" ON "FosterOffer"("rescueCaseId", "fosterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FosterPlacement_offerId_key" ON "FosterPlacement"("offerId");

-- CreateIndex
CREATE INDEX "FosterPlacement_rescueCaseId_status_idx" ON "FosterPlacement"("rescueCaseId", "status");

-- CreateIndex
CREATE INDEX "FosterPlacement_fosterProfileId_status_idx" ON "FosterPlacement"("fosterProfileId", "status");

-- CreateIndex
CREATE INDEX "RescueCaseEvent_caseId_createdAt_idx" ON "RescueCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "RescueCaseEvent_actorId_idx" ON "RescueCaseEvent"("actorId");

-- CreateIndex
CREATE INDEX "Message_fosterPlacementId_idx" ON "Message"("fosterPlacementId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fosterPlacementId_fkey" FOREIGN KEY ("fosterPlacementId") REFERENCES "FosterPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterProfile" ADD CONSTRAINT "FosterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueCase" ADD CONSTRAINT "RescueCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueCase" ADD CONSTRAINT "RescueCase_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterOffer" ADD CONSTRAINT "FosterOffer_rescueCaseId_fkey" FOREIGN KEY ("rescueCaseId") REFERENCES "RescueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterOffer" ADD CONSTRAINT "FosterOffer_fosterProfileId_fkey" FOREIGN KEY ("fosterProfileId") REFERENCES "FosterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterPlacement" ADD CONSTRAINT "FosterPlacement_rescueCaseId_fkey" FOREIGN KEY ("rescueCaseId") REFERENCES "RescueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterPlacement" ADD CONSTRAINT "FosterPlacement_fosterProfileId_fkey" FOREIGN KEY ("fosterProfileId") REFERENCES "FosterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FosterPlacement" ADD CONSTRAINT "FosterPlacement_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "FosterOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueCaseEvent" ADD CONSTRAINT "RescueCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RescueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueCaseEvent" ADD CONSTRAINT "RescueCaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
