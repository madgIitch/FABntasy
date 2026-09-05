CREATE TABLE "ingestion_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "competition_season_id" UUID,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL,
    "counters" JSONB,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingestion_runs_job_name_started_at_idx"
ON "ingestion_runs"("job_name", "started_at");

CREATE INDEX "ingestion_runs_competition_season_id_started_at_idx"
ON "ingestion_runs"("competition_season_id", "started_at");

ALTER TABLE "ingestion_runs"
ADD CONSTRAINT "ingestion_runs_competition_season_id_fkey"
FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
