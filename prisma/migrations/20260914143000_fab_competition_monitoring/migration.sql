CREATE TABLE "fab_competition_catalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "opaque_id" VARCHAR(191) NOT NULL,
  "category_competition_id" VARCHAR(191) NOT NULL,
  "category_name" TEXT NOT NULL,
  "competition_name" TEXT NOT NULL,
  "delegation_name" TEXT NOT NULL,
  "season_name" TEXT,
  "alias" TEXT,
  "monitored" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(24) NOT NULL DEFAULT 'DISCOVERED',
  "checksum" CHAR(64) NOT NULL,
  "competition_season_id" UUID,
  "first_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fab_competition_catalog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fab_competition_catalog_opaque_id_key" UNIQUE ("opaque_id"),
  CONSTRAINT "fab_competition_catalog_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "fab_competition_catalog_category_competition_id_idx" ON "fab_competition_catalog"("category_competition_id");
CREATE INDEX "fab_competition_catalog_monitored_last_checked_at_idx" ON "fab_competition_catalog"("monitored", "last_checked_at");
CREATE INDEX "fab_competition_catalog_delegation_name_competition_name_idx" ON "fab_competition_catalog"("delegation_name", "competition_name");

CREATE TABLE "fab_competition_catalog_changes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "catalog_id" UUID NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "before" JSONB,
  "after" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fab_competition_catalog_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fab_competition_catalog_changes_catalog_id_checksum_key" UNIQUE ("catalog_id", "checksum"),
  CONSTRAINT "fab_competition_catalog_changes_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "fab_competition_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "fab_competition_catalog_changes_created_at_idx" ON "fab_competition_catalog_changes"("created_at");

CREATE TABLE "fab_competition_catalog_scans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" VARCHAR(24) NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(3),
  "pages" INTEGER NOT NULL DEFAULT 0,
  "observed" INTEGER NOT NULL DEFAULT 0,
  "discovered" INTEGER NOT NULL DEFAULT 0,
  "changed" INTEGER NOT NULL DEFAULT 0,
  "error_code" VARCHAR(64),
  CONSTRAINT "fab_competition_catalog_scans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fab_competition_catalog_scans_started_at_idx" ON "fab_competition_catalog_scans"("started_at");
