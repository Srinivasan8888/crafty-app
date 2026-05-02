-- Crafty raw migration 0001
-- Issue 1.2 — Event organizer 3-FK CHECK
-- Issue 2.3 — Search vector triggers (parent + join tables + category rename)
-- Apply with: psql "$DATABASE_URL" -f prisma/raw-migrations/0001_fts_and_constraints.sql

-- ─── Extensions ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─── Event organizer CHECK ─────────────────────────────────────────────
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS event_one_organizer;
ALTER TABLE "Event"
  ADD CONSTRAINT event_one_organizer CHECK (
    (CASE WHEN organizer_crafter_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN organizer_store_id   IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN organizer_studio_id  IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- ─── Search vectors ────────────────────────────────────────────────────
ALTER TABLE "Crafter" ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE "Store"   ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE "Studio"  ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE "Event"   ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS crafter_search_idx ON "Crafter" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS store_search_idx   ON "Store"   USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS studio_search_idx  ON "Studio"  USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS event_search_idx   ON "Event"   USING GIN (search_vector);

-- ─── Helper: rebuild a single crafter's vector ────────────────────────
CREATE OR REPLACE FUNCTION crafter_rebuild_vector(p_id text) RETURNS void AS $$
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
   WHERE c.id = p_id;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION store_rebuild_vector(p_id text) RETURNS void AS $$
BEGIN
  UPDATE "Store" s
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(s.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(s.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(sc.display_name, ' ')
                               FROM "SupplyCategoryOnStore" socc
                               JOIN "SupplyCategory" sc ON sc.id = socc.category_id
                              WHERE socc.store_id = s.id), ''))), 'B')
   WHERE s.id = p_id;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION studio_rebuild_vector(p_id text) RETURNS void AS $$
BEGIN
  UPDATE "Studio" st
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(st.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(st.address, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(
                            (SELECT string_agg(d.display_name, ' ')
                               FROM "DisciplineOnStudio" dos
                               JOIN "Discipline" d ON d.id = dos.discipline_id
                              WHERE dos.studio_id = st.id), ''))), 'B')
   WHERE st.id = p_id;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION event_rebuild_vector(p_id text) RETURNS void AS $$
BEGIN
  UPDATE "Event" e
     SET search_vector = setweight(to_tsvector('simple', unaccent(coalesce(e.name, ''))), 'A')
                       || setweight(to_tsvector('simple', unaccent(coalesce(e.description, ''))), 'C')
                       || setweight(to_tsvector('simple', unaccent(coalesce(e.venue_name, ''))), 'B')
   WHERE e.id = p_id;
END $$ LANGUAGE plpgsql;

-- ─── Parent-table triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_crafter_vector() RETURNS trigger AS $$
BEGIN PERFORM crafter_rebuild_vector(NEW.id); RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION trg_store_vector()   RETURNS trigger AS $$
BEGIN PERFORM store_rebuild_vector(NEW.id);   RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION trg_studio_vector()  RETURNS trigger AS $$
BEGIN PERFORM studio_rebuild_vector(NEW.id);  RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION trg_event_vector()   RETURNS trigger AS $$
BEGIN PERFORM event_rebuild_vector(NEW.id);   RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crafter_vector_trg ON "Crafter";
CREATE TRIGGER crafter_vector_trg AFTER INSERT OR UPDATE OF name, tagline, bio ON "Crafter"
  FOR EACH ROW EXECUTE FUNCTION trg_crafter_vector();

DROP TRIGGER IF EXISTS store_vector_trg ON "Store";
CREATE TRIGGER store_vector_trg AFTER INSERT OR UPDATE OF name, address ON "Store"
  FOR EACH ROW EXECUTE FUNCTION trg_store_vector();

DROP TRIGGER IF EXISTS studio_vector_trg ON "Studio";
CREATE TRIGGER studio_vector_trg AFTER INSERT OR UPDATE OF name, address ON "Studio"
  FOR EACH ROW EXECUTE FUNCTION trg_studio_vector();

DROP TRIGGER IF EXISTS event_vector_trg ON "Event";
CREATE TRIGGER event_vector_trg AFTER INSERT OR UPDATE OF name, description, venue_name ON "Event"
  FOR EACH ROW EXECUTE FUNCTION trg_event_vector();

-- ─── Join-table triggers (Issue 2.3 — category add/remove) ───────────
CREATE OR REPLACE FUNCTION trg_crafter_cat_join() RETURNS trigger AS $$
DECLARE target_id text;
BEGIN
  target_id := COALESCE(NEW.crafter_id, OLD.crafter_id);
  PERFORM crafter_rebuild_vector(target_id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS crafter_cat_join_trg ON "CraftCategoryOnCrafter";
CREATE TRIGGER crafter_cat_join_trg AFTER INSERT OR DELETE ON "CraftCategoryOnCrafter"
  FOR EACH ROW EXECUTE FUNCTION trg_crafter_cat_join();

CREATE OR REPLACE FUNCTION trg_store_cat_join() RETURNS trigger AS $$
DECLARE target_id text;
BEGIN
  target_id := COALESCE(NEW.store_id, OLD.store_id);
  PERFORM store_rebuild_vector(target_id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS store_cat_join_trg ON "SupplyCategoryOnStore";
CREATE TRIGGER store_cat_join_trg AFTER INSERT OR DELETE ON "SupplyCategoryOnStore"
  FOR EACH ROW EXECUTE FUNCTION trg_store_cat_join();

CREATE OR REPLACE FUNCTION trg_studio_disc_join() RETURNS trigger AS $$
DECLARE target_id text;
BEGIN
  target_id := COALESCE(NEW.studio_id, OLD.studio_id);
  PERFORM studio_rebuild_vector(target_id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS studio_disc_join_trg ON "DisciplineOnStudio";
CREATE TRIGGER studio_disc_join_trg AFTER INSERT OR DELETE ON "DisciplineOnStudio"
  FOR EACH ROW EXECUTE FUNCTION trg_studio_disc_join();

-- ─── Category rename mass-reindex (Issue 2.3 — third trigger) ────────
CREATE OR REPLACE FUNCTION trg_craft_cat_rename() RETURNS trigger AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE "Crafter" c
       SET search_vector = search_vector  -- no-op write to fire crafter trigger
     WHERE EXISTS (SELECT 1 FROM "CraftCategoryOnCrafter" j WHERE j.crafter_id = c.id AND j.category_id = NEW.id);
    -- Force rebuild explicitly for clarity:
    PERFORM crafter_rebuild_vector(c.id) FROM "Crafter" c
      JOIN "CraftCategoryOnCrafter" j ON j.crafter_id = c.id
     WHERE j.category_id = NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS craft_cat_rename_trg ON "CraftCategory";
CREATE TRIGGER craft_cat_rename_trg AFTER UPDATE OF display_name ON "CraftCategory"
  FOR EACH ROW EXECUTE FUNCTION trg_craft_cat_rename();

CREATE OR REPLACE FUNCTION trg_supply_cat_rename() RETURNS trigger AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    PERFORM store_rebuild_vector(s.id) FROM "Store" s
      JOIN "SupplyCategoryOnStore" j ON j.store_id = s.id
     WHERE j.category_id = NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS supply_cat_rename_trg ON "SupplyCategory";
CREATE TRIGGER supply_cat_rename_trg AFTER UPDATE OF display_name ON "SupplyCategory"
  FOR EACH ROW EXECUTE FUNCTION trg_supply_cat_rename();

CREATE OR REPLACE FUNCTION trg_discipline_rename() RETURNS trigger AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    PERFORM studio_rebuild_vector(s.id) FROM "Studio" s
      JOIN "DisciplineOnStudio" j ON j.studio_id = s.id
     WHERE j.discipline_id = NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS discipline_rename_trg ON "Discipline";
CREATE TRIGGER discipline_rename_trg AFTER UPDATE OF display_name ON "Discipline"
  FOR EACH ROW EXECUTE FUNCTION trg_discipline_rename();
