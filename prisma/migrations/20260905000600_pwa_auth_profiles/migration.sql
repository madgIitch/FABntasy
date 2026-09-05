CREATE TABLE "user_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "auth_user_id" UUID NOT NULL,
  "display_name" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_profiles_auth_user_id_key" UNIQUE ("auth_user_id"),
  CONSTRAINT "user_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES auth.users("id") ON DELETE CASCADE
);

ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON "user_profiles" FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own profile" ON "user_profiles" FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_user_id) VALUES (NEW.id) ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();
