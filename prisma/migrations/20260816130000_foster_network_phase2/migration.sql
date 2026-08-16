ALTER TYPE "NotificationType" ADD VALUE 'FOSTER_CASE_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'FOSTER_ADOPTION';

ALTER TYPE "FosterPlacementStatus" ADD VALUE 'AWAITING_ADOPTION';

CREATE TYPE "FosterAdoptionDraftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'MATCHED', 'COMPLETED', 'PAUSED');
CREATE TYPE "PetCareRole" AS ENUM ('OWNED', 'FOSTER');

ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "Post"
  ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "rescueCaseId" TEXT;

ALTER TABLE "Pet"
  ALTER COLUMN "vaccinated" DROP NOT NULL,
  ALTER COLUMN "vaccinated" DROP DEFAULT,
  ALTER COLUMN "neutered" DROP NOT NULL,
  ALTER COLUMN "neutered" DROP DEFAULT,
  ADD COLUMN "careRole" "PetCareRole" NOT NULL DEFAULT 'OWNED';

ALTER TABLE "AdoptionListing" ADD COLUMN "sourceRescueCaseId" TEXT;

ALTER TABLE "FosterProfile"
  ADD COLUMN "caseAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alertRadiusKm" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "alertSpecies" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "alertUrgencies" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "RescueCaseEvent"
  ADD COLUMN "eventKey" TEXT,
  ADD COLUMN "payload" JSONB;

CREATE TABLE "FosterAdoptionDraft" (
  "id" TEXT NOT NULL,
  "rescueCaseId" TEXT NOT NULL,
  "placementId" TEXT NOT NULL,
  "managedByUserId" TEXT NOT NULL,
  "petId" TEXT,
  "listingId" TEXT,
  "selectedApplicationId" TEXT,
  "status" "FosterAdoptionDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "name" TEXT,
  "breed" TEXT,
  "estimatedAge" INTEGER,
  "gender" TEXT,
  "energy" TEXT,
  "character" TEXT,
  "bio" TEXT,
  "goodWithKids" TEXT,
  "goodWithDogs" TEXT,
  "goodWithCats" TEXT,
  "vaccinated" BOOLEAN,
  "neutered" BOOLEAN,
  "specialNeeds" TEXT,
  "requirements" TEXT,
  "publicZone" TEXT,
  "images" TEXT NOT NULL DEFAULT '[]',
  "fosterConfirmedAt" TIMESTAMP(3),
  "adopterConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FosterAdoptionDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "Post_rescueCaseId_key" ON "Post"("rescueCaseId");
CREATE INDEX "Post_isVisible_createdAt_idx" ON "Post"("isVisible", "createdAt");
CREATE UNIQUE INDEX "AdoptionListing_sourceRescueCaseId_key" ON "AdoptionListing"("sourceRescueCaseId");
CREATE UNIQUE INDEX "RescueCaseEvent_eventKey_key" ON "RescueCaseEvent"("eventKey");
CREATE UNIQUE INDEX "FosterAdoptionDraft_rescueCaseId_key" ON "FosterAdoptionDraft"("rescueCaseId");
CREATE UNIQUE INDEX "FosterAdoptionDraft_placementId_key" ON "FosterAdoptionDraft"("placementId");
CREATE UNIQUE INDEX "FosterAdoptionDraft_listingId_key" ON "FosterAdoptionDraft"("listingId");
CREATE UNIQUE INDEX "FosterAdoptionDraft_selectedApplicationId_key" ON "FosterAdoptionDraft"("selectedApplicationId");
CREATE INDEX "FosterAdoptionDraft_managedByUserId_status_updatedAt_idx" ON "FosterAdoptionDraft"("managedByUserId", "status", "updatedAt");

ALTER TABLE "Post" ADD CONSTRAINT "Post_rescueCaseId_fkey"
  FOREIGN KEY ("rescueCaseId") REFERENCES "RescueCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_sourceRescueCaseId_fkey"
  FOREIGN KEY ("sourceRescueCaseId") REFERENCES "RescueCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_rescueCaseId_fkey"
  FOREIGN KEY ("rescueCaseId") REFERENCES "RescueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_placementId_fkey"
  FOREIGN KEY ("placementId") REFERENCES "FosterPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_managedByUserId_fkey"
  FOREIGN KEY ("managedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_petId_fkey"
  FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "AdoptionListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FosterAdoptionDraft" ADD CONSTRAINT "FosterAdoptionDraft_selectedApplicationId_fkey"
  FOREIGN KEY ("selectedApplicationId") REFERENCES "AdoptionApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
