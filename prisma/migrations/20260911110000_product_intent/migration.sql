ALTER TABLE "UserSettings" ADD COLUMN "entryIntent" TEXT;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_entryIntent_check" CHECK ("entryIntent" IS NULL OR "entryIntent" IN ('MEET', 'ADOPT', 'HELP', 'SERVICES'));
