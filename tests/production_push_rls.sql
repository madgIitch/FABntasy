-- Run after migrations against the isolated Supabase/PostgreSQL test project.
BEGIN;
DO $$
DECLARE user_a uuid:=gen_random_uuid();user_b uuid:=gen_random_uuid();profile_a uuid:=gen_random_uuid();profile_b uuid:=gen_random_uuid();sub_b uuid:=gen_random_uuid();
BEGIN
 INSERT INTO user_profiles(id,auth_user_id,created_at,updated_at)VALUES(profile_a,user_a,now(),now()),(profile_b,user_b,now(),now());
 INSERT INTO push_subscriptions(id,user_profile_id,endpoint,p256dh,auth,updated_at)VALUES(sub_b,profile_b,'https://push.invalid/b','redacted','redacted',now());
 INSERT INTO notification_preferences(user_profile_id,intent,enabled,updated_at)VALUES(profile_b,'ROUND_RESULT',true,now());
 INSERT INTO notification_deliveries(user_profile_id,push_subscription_id,intent,event_key,status,updated_at)VALUES(profile_b,sub_b,'ROUND_RESULT','rls-b','PENDING',now());
 PERFORM set_config('request.jwt.claim.sub',user_a::text,true);SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM push_subscriptions WHERE user_profile_id=profile_b)THEN RAISE EXCEPTION 'cross-user SELECT allowed';END IF;
 UPDATE notification_preferences SET enabled=false WHERE user_profile_id=profile_b;IF FOUND THEN RAISE EXCEPTION 'cross-user UPDATE allowed';END IF;
 DELETE FROM notification_deliveries WHERE user_profile_id=profile_b;IF FOUND THEN RAISE EXCEPTION 'cross-user DELETE allowed';END IF;
 BEGIN INSERT INTO notification_preferences(user_profile_id,intent,enabled,updated_at)VALUES(profile_b,'ROUND_START',true,now());RAISE EXCEPTION 'cross-user INSERT allowed';EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;END;
END $$;
ROLLBACK;
