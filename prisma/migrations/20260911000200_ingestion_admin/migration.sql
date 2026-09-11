CREATE TABLE "admin_grants" ("id" UUID NOT NULL DEFAULT gen_random_uuid(),"user_profile_id" UUID NOT NULL,"role" VARCHAR(40) NOT NULL,"granted_by_id" UUID,"granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"revoked_at" TIMESTAMPTZ(3),CONSTRAINT "admin_grants_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "admin_grants_user_profile_id_role_key" ON "admin_grants"("user_profile_id","role");
CREATE INDEX "admin_grants_role_revoked_at_idx" ON "admin_grants"("role","revoked_at");
ALTER TABLE "admin_grants" ADD CONSTRAINT "admin_grants_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_grants" ADD CONSTRAINT "admin_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ingestion_jobs" ("id" UUID NOT NULL DEFAULT gen_random_uuid(),"type" VARCHAR(40) NOT NULL,"target_key" VARCHAR(191) NOT NULL,"target" JSONB NOT NULL,"idempotency_key" VARCHAR(255) NOT NULL,"status" VARCHAR(24) NOT NULL DEFAULT 'QUEUED',"requested_by_id" UUID NOT NULL,"ingestion_run_id" UUID,"counters" JSONB,"error_code" VARCHAR(64),"claimed_by" VARCHAR(128),"requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"started_at" TIMESTAMPTZ(3),"finished_at" TIMESTAMPTZ(3),"heartbeat_at" TIMESTAMPTZ(3),CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ingestion_jobs_status_requested_at_idx" ON "ingestion_jobs"("status","requested_at");
CREATE INDEX "ingestion_jobs_type_target_key_status_idx" ON "ingestion_jobs"("type","target_key","status");
CREATE UNIQUE INDEX "ingestion_jobs_active_target_key" ON "ingestion_jobs"("type","target_key") WHERE "status" IN ('QUEUED','RUNNING');
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ingestion_heartbeats" ("worker_id" VARCHAR(128) NOT NULL,"seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"version" VARCHAR(64),"metadata" JSONB,CONSTRAINT "ingestion_heartbeats_pkey" PRIMARY KEY ("worker_id"));

CREATE TABLE "admin_audit_events" ("id" UUID NOT NULL DEFAULT gen_random_uuid(),"actor_profile_id" UUID NOT NULL,"action" VARCHAR(64) NOT NULL,"resource_type" VARCHAR(48) NOT NULL,"resource_id" VARCHAR(191),"result" VARCHAR(24) NOT NULL,"reason" VARCHAR(240),"created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id"));
CREATE INDEX "admin_audit_events_actor_profile_id_created_at_idx" ON "admin_audit_events"("actor_profile_id","created_at");
CREATE INDEX "admin_audit_events_resource_type_resource_id_created_at_idx" ON "admin_audit_events"("resource_type","resource_id","created_at");
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
