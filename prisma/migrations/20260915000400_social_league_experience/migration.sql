CREATE TABLE "league_activity_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "league_id" UUID NOT NULL, "type" VARCHAR(32) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL, "actor_profile_id" UUID, "payload_version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL, "source_type" VARCHAR(40) NOT NULL, "source_id" VARCHAR(191) NOT NULL,
  "backfill" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_activity_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_activity_events_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT,
  CONSTRAINT "league_activity_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL,
  CONSTRAINT "league_activity_events_type_check" CHECK ("type" IN ('PLAYER_BOUGHT','PLAYER_SOLD','CLAUSE_EXECUTED','PLAYER_PROTECTED','PRICE_CHANGED','MEMBER_JOINED','ROUND_PUBLISHED','ROUND_WINNER','RANK_CHANGED','RECORD_SET','ACHIEVEMENT_EARNED')),
  CONSTRAINT "league_activity_events_payload_check" CHECK ("payload_version" = 1 AND jsonb_typeof("payload") = 'object')
);
CREATE UNIQUE INDEX "league_activity_events_source_key" ON "league_activity_events"("league_id","source_type","source_id","type");
CREATE INDEX "league_activity_events_feed_idx" ON "league_activity_events"("league_id","occurred_at" DESC,"id" DESC);

CREATE TABLE "league_event_reactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "event_id" UUID NOT NULL, "user_profile_id" UUID NOT NULL,
  "emoji" VARCHAR(8) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_event_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_event_reactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "league_activity_events"("id") ON DELETE CASCADE,
  CONSTRAINT "league_event_reactions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "league_event_reactions_emoji_check" CHECK ("emoji" IN ('😂','🔥','👀','💀','🤡'))
);
CREATE UNIQUE INDEX "league_event_reactions_unique" ON "league_event_reactions"("event_id","user_profile_id","emoji");
CREATE INDEX "league_event_reactions_count_idx" ON "league_event_reactions"("event_id","emoji");

CREATE TABLE "league_presence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "league_id" UUID NOT NULL, "user_profile_id" UUID NOT NULL,
  "session_id" UUID NOT NULL, "expires_at" TIMESTAMPTZ(3) NOT NULL, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "league_presence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_presence_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE CASCADE,
  CONSTRAINT "league_presence_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "league_presence_session_key" ON "league_presence"("league_id","user_profile_id","session_id");
CREATE INDEX "league_presence_expiry_idx" ON "league_presence"("league_id","expires_at");

CREATE TABLE "player_follows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_profile_id" UUID NOT NULL, "player_registration_id" UUID NOT NULL,
  "competition_season_id" UUID NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_follows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_follows_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "player_follows_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "player_follows_unique" ON "player_follows"("user_profile_id","player_registration_id");
CREATE INDEX "player_follows_alert_idx" ON "player_follows"("competition_season_id","player_registration_id");

CREATE TABLE "league_achievement_awards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "league_id" UUID NOT NULL, "user_profile_id" UUID NOT NULL,
  "achievement_type" VARCHAR(40) NOT NULL, "rule_version" VARCHAR(32) NOT NULL, "round_number" INTEGER,
  "revision" INTEGER NOT NULL, "inputs" JSONB NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "supersedes_id" UUID, "awarded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "league_achievement_awards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_achievement_awards_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT,
  CONSTRAINT "league_achievement_awards_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "league_achievement_awards_revision_key" ON "league_achievement_awards"("league_id","achievement_type","user_profile_id","round_number","revision");
CREATE INDEX "league_achievement_awards_active_idx" ON "league_achievement_awards"("league_id","status","awarded_at" DESC);

ALTER TABLE "league_activity_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "league_event_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "league_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "league_achievement_awards" ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION is_active_league_member(target_league UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM league_memberships lm JOIN user_profiles up ON up.id=lm.user_profile_id WHERE lm.league_id=target_league AND lm.status='ACTIVE' AND up.auth_user_id=auth.uid());
$$;
CREATE POLICY "active members read activity" ON "league_activity_events" FOR SELECT USING (is_active_league_member(league_id));
CREATE POLICY "active members read reactions" ON "league_event_reactions" FOR SELECT USING (EXISTS (SELECT 1 FROM league_activity_events e WHERE e.id=event_id AND is_active_league_member(e.league_id)));
CREATE POLICY "members own reactions" ON "league_event_reactions" FOR ALL USING (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid()) AND EXISTS (SELECT 1 FROM league_activity_events e WHERE e.id=event_id AND is_active_league_member(e.league_id))) WITH CHECK (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid()) AND EXISTS (SELECT 1 FROM league_activity_events e WHERE e.id=event_id AND is_active_league_member(e.league_id)));
CREATE POLICY "active members read presence" ON "league_presence" FOR SELECT USING (is_active_league_member(league_id));
CREATE POLICY "members own presence" ON "league_presence" FOR ALL USING (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid()) AND is_active_league_member(league_id)) WITH CHECK (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid()) AND is_active_league_member(league_id));
CREATE POLICY "users own follows" ON "player_follows" FOR ALL USING (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid())) WITH CHECK (user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=auth.uid()));
CREATE POLICY "active members read awards" ON "league_achievement_awards" FOR SELECT USING (is_active_league_member(league_id));
