-- Expand the solidarity network without removing legacy foster alert columns.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VOLUNTEER_OFFER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VOLUNTEER_RESPONSE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VOLUNTEER_ASSIGNMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOLIDARITY_ADOPTION_ALERT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOLIDARITY_VETERINARY_ALERT';

ALTER TYPE "RescueCaseStatus" ADD VALUE IF NOT EXISTS 'ASSISTANCE_ACTIVE';

CREATE TYPE "RescueNeedType" AS ENUM ('FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT');
CREATE TYPE "RescueNeedStatus" AS ENUM ('OPEN', 'INTERESTED', 'ASSIGNED', 'ACTIVE', 'FULFILLED', 'CANCELLED');
CREATE TYPE "VolunteerProfileStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED');
CREATE TYPE "VolunteerRole" AS ENUM ('TRANSPORT', 'VET_COMPANION', 'FIELD_SUPPORT', 'SUPPLIES_LOGISTICS');
CREATE TYPE "VolunteerOfferStatus" AS ENUM ('PENDING', 'INTERESTED', 'DECLINED', 'SELECTED', 'CLOSED', 'EXPIRED');
CREATE TYPE "VolunteerAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SolidarityAlertType" AS ENUM ('FOSTER', 'ADOPTION', 'VETERINARY');
CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'CLICKED', 'FAILED');

CREATE TABLE "RescueNeed" (
  "id" TEXT NOT NULL,
  "rescueCaseId" TEXT NOT NULL,
  "type" "RescueNeedType" NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "details" TEXT,
  "status" "RescueNeedStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RescueNeed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VolunteerProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "roles" TEXT NOT NULL DEFAULT '[]',
  "location" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "radiusKm" INTEGER NOT NULL DEFAULT 5,
  "availableFrom" TIMESTAMP(3),
  "availableUntil" TIMESTAMP(3),
  "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 1,
  "occupiedTasks" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "adultDeclaredAt" TIMESTAMP(3) NOT NULL,
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VolunteerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerOffer" (
  "id" TEXT NOT NULL,
  "needId" TEXT NOT NULL,
  "volunteerProfileId" TEXT NOT NULL,
  "role" "VolunteerRole" NOT NULL,
  "status" "VolunteerOfferStatus" NOT NULL DEFAULT 'PENDING',
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "score" INTEGER NOT NULL,
  "reasons" TEXT NOT NULL DEFAULT '[]',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "selectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VolunteerOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerAssignment" (
  "id" TEXT NOT NULL,
  "needId" TEXT NOT NULL,
  "volunteerProfileId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "status" "VolunteerAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" TEXT,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VolunteerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SolidarityAlertProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "locationConsentAt" TIMESTAMP(3) NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SolidarityAlertProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SolidaritySubscription" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "SolidarityAlertType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "radiusKm" INTEGER NOT NULL DEFAULT 5,
  "species" TEXT NOT NULL DEFAULT '[]',
  "sizes" TEXT NOT NULL DEFAULT '[]',
  "urgencies" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SolidaritySubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "disabledAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "status" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerStatus" INTEGER,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyntheticRun" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyntheticRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "syntheticRunId" TEXT;
ALTER TABLE "Message" ADD COLUMN "volunteerAssignmentId" TEXT;

CREATE UNIQUE INDEX "RescueNeed_rescueCaseId_type_key" ON "RescueNeed"("rescueCaseId", "type");
CREATE INDEX "RescueNeed_type_status_createdAt_idx" ON "RescueNeed"("type", "status", "createdAt");
CREATE INDEX "RescueNeed_rescueCaseId_isPrimary_idx" ON "RescueNeed"("rescueCaseId", "isPrimary");
CREATE UNIQUE INDEX "VolunteerProfile_userId_key" ON "VolunteerProfile"("userId");
CREATE INDEX "VolunteerProfile_status_idx" ON "VolunteerProfile"("status");
CREATE INDEX "VolunteerProfile_latitude_longitude_idx" ON "VolunteerProfile"("latitude", "longitude");
CREATE UNIQUE INDEX "VolunteerOffer_needId_volunteerProfileId_key" ON "VolunteerOffer"("needId", "volunteerProfileId");
CREATE INDEX "VolunteerOffer_volunteerProfileId_status_createdAt_idx" ON "VolunteerOffer"("volunteerProfileId", "status", "createdAt");
CREATE INDEX "VolunteerOffer_needId_status_idx" ON "VolunteerOffer"("needId", "status");
CREATE INDEX "VolunteerOffer_expiresAt_idx" ON "VolunteerOffer"("expiresAt");
CREATE UNIQUE INDEX "VolunteerAssignment_offerId_key" ON "VolunteerAssignment"("offerId");
CREATE INDEX "VolunteerAssignment_needId_status_idx" ON "VolunteerAssignment"("needId", "status");
CREATE INDEX "VolunteerAssignment_volunteerProfileId_status_idx" ON "VolunteerAssignment"("volunteerProfileId", "status");
CREATE UNIQUE INDEX "SolidarityAlertProfile_userId_key" ON "SolidarityAlertProfile"("userId");
CREATE INDEX "SolidarityAlertProfile_latitude_longitude_idx" ON "SolidarityAlertProfile"("latitude", "longitude");
CREATE UNIQUE INDEX "SolidaritySubscription_profileId_type_key" ON "SolidaritySubscription"("profileId", "type");
CREATE INDEX "SolidaritySubscription_type_enabled_idx" ON "SolidaritySubscription"("type", "enabled");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_disabledAt_idx" ON "PushSubscription"("userId", "disabledAt");
CREATE UNIQUE INDEX "PushDelivery_notificationId_subscriptionId_key" ON "PushDelivery"("notificationId", "subscriptionId");
CREATE INDEX "PushDelivery_status_attempts_updatedAt_idx" ON "PushDelivery"("status", "attempts", "updatedAt");
CREATE INDEX "SyntheticRun_status_expiresAt_idx" ON "SyntheticRun"("status", "expiresAt");
CREATE INDEX "User_syntheticRunId_idx" ON "User"("syntheticRunId");
CREATE INDEX "Message_volunteerAssignmentId_idx" ON "Message"("volunteerAssignmentId");

ALTER TABLE "VolunteerProfile"
  ADD CONSTRAINT "VolunteerProfile_radiusKm_check" CHECK ("radiusKm" BETWEEN 1 AND 50),
  ADD CONSTRAINT "VolunteerProfile_maxConcurrentTasks_check" CHECK ("maxConcurrentTasks" BETWEEN 1 AND 5),
  ADD CONSTRAINT "VolunteerProfile_occupiedTasks_check" CHECK ("occupiedTasks" >= 0 AND "occupiedTasks" <= "maxConcurrentTasks");
ALTER TABLE "SolidaritySubscription"
  ADD CONSTRAINT "SolidaritySubscription_radiusKm_check" CHECK ("radiusKm" BETWEEN 1 AND 50);
ALTER TABLE "PushDelivery"
  ADD CONSTRAINT "PushDelivery_attempts_check" CHECK ("attempts" BETWEEN 0 AND 3);

ALTER TABLE "RescueNeed" ADD CONSTRAINT "RescueNeed_rescueCaseId_fkey" FOREIGN KEY ("rescueCaseId") REFERENCES "RescueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerOffer" ADD CONSTRAINT "VolunteerOffer_needId_fkey" FOREIGN KEY ("needId") REFERENCES "RescueNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerOffer" ADD CONSTRAINT "VolunteerOffer_volunteerProfileId_fkey" FOREIGN KEY ("volunteerProfileId") REFERENCES "VolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_needId_fkey" FOREIGN KEY ("needId") REFERENCES "RescueNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_volunteerProfileId_fkey" FOREIGN KEY ("volunteerProfileId") REFERENCES "VolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "VolunteerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolidarityAlertProfile" ADD CONSTRAINT "SolidarityAlertProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolidaritySubscription" ADD CONSTRAINT "SolidaritySubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SolidarityAlertProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_syntheticRunId_fkey" FOREIGN KEY ("syntheticRunId") REFERENCES "SyntheticRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_volunteerAssignmentId_fkey" FOREIGN KEY ("volunteerAssignmentId") REFERENCES "VolunteerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RescueNeed" ("id", "rescueCaseId", "type", "isPrimary", "status", "createdAt", "updatedAt")
SELECT
  CONCAT('legacy-need-', "id"),
  "id",
  'FOSTER'::"RescueNeedType",
  true,
  CASE "status"
    WHEN 'SEARCHING' THEN 'OPEN'::"RescueNeedStatus"
    WHEN 'INTERESTED' THEN 'INTERESTED'::"RescueNeedStatus"
    WHEN 'COORDINATING' THEN 'ASSIGNED'::"RescueNeedStatus"
    WHEN 'IN_FOSTER' THEN 'ACTIVE'::"RescueNeedStatus"
    WHEN 'RESOLVED' THEN 'FULFILLED'::"RescueNeedStatus"
    WHEN 'NEEDS_ADOPTION' THEN 'FULFILLED'::"RescueNeedStatus"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"RescueNeedStatus"
  END,
  "createdAt",
  "updatedAt"
FROM "RescueCase";

INSERT INTO "SolidarityAlertProfile" ("id", "userId", "location", "latitude", "longitude", "locationConsentAt", "consentVersion", "createdAt", "updatedAt")
SELECT
  CONCAT('legacy-alert-profile-', "id"),
  "userId",
  "location",
  "latitude",
  "longitude",
  COALESCE("termsAcceptedAt", "createdAt"),
  '2026-08-16',
  "createdAt",
  "updatedAt"
FROM "FosterProfile";

INSERT INTO "SolidaritySubscription" ("id", "profileId", "type", "enabled", "radiusKm", "species", "sizes", "urgencies", "createdAt", "updatedAt")
SELECT CONCAT('legacy-alert-foster-', "id"), CONCAT('legacy-alert-profile-', "id"), 'FOSTER'::"SolidarityAlertType", "caseAlertsEnabled", "alertRadiusKm", "alertSpecies", '[]', "alertUrgencies", "createdAt", "updatedAt" FROM "FosterProfile"
UNION ALL
SELECT CONCAT('legacy-alert-adoption-', "id"), CONCAT('legacy-alert-profile-', "id"), 'ADOPTION'::"SolidarityAlertType", false, 5, '[]', '[]', '[]', "createdAt", "updatedAt" FROM "FosterProfile"
UNION ALL
SELECT CONCAT('legacy-alert-vet-', "id"), CONCAT('legacy-alert-profile-', "id"), 'VETERINARY'::"SolidarityAlertType", false, 5, '[]', '[]', '[]', "createdAt", "updatedAt" FROM "FosterProfile";
