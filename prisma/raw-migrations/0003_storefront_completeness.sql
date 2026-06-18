-- storefront-completeness — additive schema for the three closed "coming soon"
-- gaps. Idempotent so it is safe to re-run; mirrors what `prisma db push` would
-- create from schema.prisma. No existing column is altered → rollback is just
-- DROP TABLE / DROP TYPE.

-- 1. Listing ↔ crafter cross-reference join tables ---------------------------

CREATE TABLE IF NOT EXISTS "StudioCrafter" (
  "studio_id"  TEXT NOT NULL,
  "crafter_id" TEXT NOT NULL,
  CONSTRAINT "StudioCrafter_pkey" PRIMARY KEY ("studio_id", "crafter_id")
);

CREATE TABLE IF NOT EXISTS "StoreCrafter" (
  "store_id"   TEXT NOT NULL,
  "crafter_id" TEXT NOT NULL,
  CONSTRAINT "StoreCrafter_pkey" PRIMARY KEY ("store_id", "crafter_id")
);

CREATE INDEX IF NOT EXISTS "StudioCrafter_crafter_id_idx" ON "StudioCrafter" ("crafter_id");
CREATE INDEX IF NOT EXISTS "StoreCrafter_crafter_id_idx"  ON "StoreCrafter"  ("crafter_id");

DO $$ BEGIN
  ALTER TABLE "StudioCrafter"
    ADD CONSTRAINT "StudioCrafter_studio_id_fkey"
    FOREIGN KEY ("studio_id") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StudioCrafter"
    ADD CONSTRAINT "StudioCrafter_crafter_id_fkey"
    FOREIGN KEY ("crafter_id") REFERENCES "Crafter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StoreCrafter"
    ADD CONSTRAINT "StoreCrafter_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StoreCrafter"
    ADD CONSTRAINT "StoreCrafter_crafter_id_fkey"
    FOREIGN KEY ("crafter_id") REFERENCES "Crafter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Community comments ------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CommunityComment" (
  "id"             TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "status"         "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
  "report_count"   INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommunityComment_status_created_at_idx"
  ON "CommunityComment" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "CommunityComment_status_report_count_idx"
  ON "CommunityComment" ("status", "report_count" DESC);

DO $$ BEGIN
  ALTER TABLE "CommunityComment"
    ADD CONSTRAINT "CommunityComment_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
