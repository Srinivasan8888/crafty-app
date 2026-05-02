-- Crafty raw migration 0002 — Eng Review 2 additions
--
-- Apply after 0001. Drops + recreates the join-table triggers as STATEMENT-level.
-- Parent-table triggers remain ROW-level (only ever update one row).
--
-- Also adds:
--   • CronRun table (job observability — PRD §14)
--   • Save composite index (dashboard activity-strip queries — PRD §17.5)
--
-- Apply with: psql "$DATABASE_URL" -f prisma/raw-migrations/0002_eng_review_2_additions.sql

-- ─── CronRun table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CronRun" (
  "id"            text PRIMARY KEY,
  "job_name"      text NOT NULL,
  "started_at"    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"  timestamp(3),
  "status"        text NOT NULL,
  "error_message" text,
  "rows_affected" integer
);

CREATE INDEX IF NOT EXISTS "CronRun_job_name_started_at_idx"
  ON "CronRun" ("job_name", "started_at" DESC);

-- ─── Save composite index ─────────────────────────────────────────────
-- Powers "saves on entity X in last 7 days" for dashboard activity strip.
CREATE INDEX IF NOT EXISTS "Save_entity_type_entity_id_created_at_idx"
  ON "Save" ("entity_type", "entity_id", "created_at" DESC);

-- ─── Convert join-table triggers to STATEMENT-level (PRD §14.1 fix) ──
-- ROW-level triggers fire N times for a bulk INSERT/DELETE on N rows,
-- causing N * vector-rebuild SELECTs. STATEMENT-level fires once and
-- collects all affected entity IDs from a transition table, running a
-- single bulk UPDATE.

-- ─── CraftCategoryOnCrafter ──────────────────────────────────────────
DROP TRIGGER IF EXISTS crafter_cat_join_trg ON "CraftCategoryOnCrafter";
DROP FUNCTION IF EXISTS trg_crafter_cat_join();

CREATE OR REPLACE FUNCTION trg_crafter_cat_join_ins() RETURNS trigger AS $$
BEGIN
  UPDATE "Crafter" c
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(c.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(c.tagline, ''))), 'B')
                       || setweight(to_tsvector('simple', unaccent(coalesce(c.bio, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(cc.display_name, ' ')
                               FROM "CraftCategoryOnCrafter" cocc
                               JOIN "CraftCategory" cc ON cc.id = cocc.category_id
                              WHERE cocc.crafter_id = c.id), ''))), 'B')
   WHERE c.id IN (SELECT DISTINCT crafter_id FROM new_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_crafter_cat_join_del() RETURNS trigger AS $$
BEGIN
  UPDATE "Crafter" c
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(c.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(c.tagline, ''))), 'B')
                       || setweight(to_tsvector('simple', unaccent(coalesce(c.bio, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(cc.display_name, ' ')
                               FROM "CraftCategoryOnCrafter" cocc
                               JOIN "CraftCategory" cc ON cc.id = cocc.category_id
                              WHERE cocc.crafter_id = c.id), ''))), 'B')
   WHERE c.id IN (SELECT DISTINCT crafter_id FROM old_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER crafter_cat_join_ins_trg
  AFTER INSERT ON "CraftCategoryOnCrafter"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_crafter_cat_join_ins();

CREATE TRIGGER crafter_cat_join_del_trg
  AFTER DELETE ON "CraftCategoryOnCrafter"
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_crafter_cat_join_del();

-- ─── SupplyCategoryOnStore ───────────────────────────────────────────
DROP TRIGGER IF EXISTS store_cat_join_trg ON "SupplyCategoryOnStore";
DROP FUNCTION IF EXISTS trg_store_cat_join();

CREATE OR REPLACE FUNCTION trg_store_cat_join_ins() RETURNS trigger AS $$
BEGIN
  UPDATE "Store" s
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(s.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(s.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(sc.display_name, ' ')
                               FROM "SupplyCategoryOnStore" socc
                               JOIN "SupplyCategory" sc ON sc.id = socc.category_id
                              WHERE socc.store_id = s.id), ''))), 'B')
   WHERE s.id IN (SELECT DISTINCT store_id FROM new_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_store_cat_join_del() RETURNS trigger AS $$
BEGIN
  UPDATE "Store" s
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(s.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(s.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(sc.display_name, ' ')
                               FROM "SupplyCategoryOnStore" socc
                               JOIN "SupplyCategory" sc ON sc.id = socc.category_id
                              WHERE socc.store_id = s.id), ''))), 'B')
   WHERE s.id IN (SELECT DISTINCT store_id FROM old_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER store_cat_join_ins_trg
  AFTER INSERT ON "SupplyCategoryOnStore"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_store_cat_join_ins();

CREATE TRIGGER store_cat_join_del_trg
  AFTER DELETE ON "SupplyCategoryOnStore"
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_store_cat_join_del();

-- ─── DisciplineOnStudio ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS studio_disc_join_trg ON "DisciplineOnStudio";
DROP FUNCTION IF EXISTS trg_studio_disc_join();

CREATE OR REPLACE FUNCTION trg_studio_disc_join_ins() RETURNS trigger AS $$
BEGIN
  UPDATE "Studio" st
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(st.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(st.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(d.display_name, ' ')
                               FROM "DisciplineOnStudio" dos
                               JOIN "Discipline" d ON d.id = dos.discipline_id
                              WHERE dos.studio_id = st.id), ''))), 'B')
   WHERE st.id IN (SELECT DISTINCT studio_id FROM new_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_studio_disc_join_del() RETURNS trigger AS $$
BEGIN
  UPDATE "Studio" st
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(st.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(st.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(d.display_name, ' ')
                               FROM "DisciplineOnStudio" dos
                               JOIN "Discipline" d ON d.id = dos.discipline_id
                              WHERE dos.studio_id = st.id), ''))), 'B')
   WHERE st.id IN (SELECT DISTINCT studio_id FROM old_rows);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER studio_disc_join_ins_trg
  AFTER INSERT ON "DisciplineOnStudio"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_studio_disc_join_ins();

CREATE TRIGGER studio_disc_join_del_trg
  AFTER DELETE ON "DisciplineOnStudio"
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_studio_disc_join_del();
