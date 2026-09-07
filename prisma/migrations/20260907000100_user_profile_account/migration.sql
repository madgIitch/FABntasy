ALTER TABLE "user_profiles"
  ADD COLUMN "username" VARCHAR(24),
  ADD COLUMN "avatar_path" TEXT;

ALTER TABLE "fantasy_teams"
  ADD COLUMN "name" VARCHAR(60) NOT NULL DEFAULT 'Mi equipo';

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_username_format_check"
  CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9_]{3,24}$');

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_username text;
BEGIN
  requested_username := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'username', '')));
  IF requested_username !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'invalid_username';
  END IF;
  INSERT INTO public.user_profiles (auth_user_id, username)
  VALUES (NEW.id, requested_username)
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Avatar owners can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar owners can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar owners can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
