-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "age_group" TEXT NOT NULL,
    "team_type" TEXT NOT NULL,
    "organization" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);
