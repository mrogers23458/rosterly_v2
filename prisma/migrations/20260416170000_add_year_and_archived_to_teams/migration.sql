-- Add year column (4-digit season year, e.g. "2026")
ALTER TABLE "teams" ADD COLUMN "year" TEXT NOT NULL DEFAULT '';

-- Add is_archived column so teams can be hidden without being deleted
ALTER TABLE "teams" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
