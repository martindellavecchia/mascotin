CREATE TYPE "RescueOfferSource" AS ENUM ('MATCHING', 'WALL');

ALTER TABLE "FosterOffer"
ADD COLUMN "source" "RescueOfferSource" NOT NULL DEFAULT 'MATCHING';

ALTER TABLE "VolunteerOffer"
ADD COLUMN "source" "RescueOfferSource" NOT NULL DEFAULT 'MATCHING';

ALTER TABLE "FosterProfile"
ADD COLUMN "radiusKm" INTEGER NOT NULL DEFAULT 5;

UPDATE "FosterProfile"
SET "radiusKm" = GREATEST(1, LEAST(50, "alertRadiusKm"));

ALTER TABLE "Message"
ADD COLUMN "fosterOfferId" TEXT,
ADD COLUMN "volunteerOfferId" TEXT;

CREATE INDEX "Message_fosterOfferId_idx" ON "Message"("fosterOfferId");
CREATE INDEX "Message_volunteerOfferId_idx" ON "Message"("volunteerOfferId");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_fosterOfferId_fkey"
FOREIGN KEY ("fosterOfferId") REFERENCES "FosterOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_volunteerOfferId_fkey"
FOREIGN KEY ("volunteerOfferId") REFERENCES "VolunteerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
