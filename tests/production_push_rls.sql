-- Run after migrations against an isolated Supabase/PostgreSQL test project.
-- Every assertion executes as user A against rows owned by user B.
BEGIN;
DO $$
DECLARE
  user_a uuid:=gen_random_uuid(); user_b uuid:=gen_random_uuid();
  profile_a uuid:=gen_random_uuid(); profile_b uuid:=gen_random_uuid();
  sub_a uuid:=gen_random_uuid(); sub_b uuid:=gen_random_uuid();
  affected integer;
BEGIN
  INSERT INTO user_profiles(id,auth_user_id,created_at,updated_at) VALUES
    (profile_a,user_a,now(),now()),(profile_b,user_b,now(),now());
  INSERT INTO push_subscriptions(id,user_profile_id,endpoint,p256dh,auth,updated_at) VALUES
    (sub_a,profile_a,'https://push.invalid/a','test-key-a','test-auth-a',now()),
    (sub_b,profile_b,'https://push.invalid/b','test-key-b','test-auth-b',now());
  INSERT INTO notification_preferences(user_profile_id,intent,enabled,updated_at) VALUES(profile_b,'ROUND_RESULT',true,now());
  INSERT INTO notification_deliveries(user_profile_id,push_subscription_id,intent,event_key,status,updated_at) VALUES(profile_b,sub_b,'ROUND_RESULT','rls-b','PENDING',now());

  PERFORM set_config('request.jwt.claim.sub',user_a::text,true);
  SET LOCAL ROLE authenticated;

  IF EXISTS(SELECT 1 FROM push_subscriptions WHERE user_profile_id=profile_b) THEN RAISE EXCEPTION 'push_subscriptions cross-user SELECT allowed'; END IF;
  IF EXISTS(SELECT 1 FROM notification_preferences WHERE user_profile_id=profile_b) THEN RAISE EXCEPTION 'notification_preferences cross-user SELECT allowed'; END IF;
  IF EXISTS(SELECT 1 FROM notification_deliveries WHERE user_profile_id=profile_b) THEN RAISE EXCEPTION 'notification_deliveries cross-user SELECT allowed'; END IF;

  BEGIN INSERT INTO push_subscriptions(user_profile_id,endpoint,p256dh,auth,updated_at) VALUES(profile_b,'https://push.invalid/cross','x','x',now()); RAISE EXCEPTION 'push_subscriptions cross-user INSERT allowed'; EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
  BEGIN INSERT INTO notification_preferences(user_profile_id,intent,enabled,updated_at) VALUES(profile_b,'ROUND_START',true,now()); RAISE EXCEPTION 'notification_preferences cross-user INSERT allowed'; EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
  BEGIN INSERT INTO notification_deliveries(user_profile_id,push_subscription_id,intent,event_key,status,updated_at) VALUES(profile_b,sub_b,'ROUND_RESULT','rls-cross','PENDING',now()); RAISE EXCEPTION 'notification_deliveries cross-user INSERT allowed'; EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;

  UPDATE push_subscriptions SET revoked_at=now() WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'push_subscriptions cross-user UPDATE allowed'; END IF;
  UPDATE notification_preferences SET enabled=false WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'notification_preferences cross-user UPDATE allowed'; END IF;
  UPDATE notification_deliveries SET status='FAILED' WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'notification_deliveries cross-user UPDATE allowed'; END IF;

  DELETE FROM notification_deliveries WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'notification_deliveries cross-user DELETE allowed'; END IF;
  DELETE FROM notification_preferences WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'notification_preferences cross-user DELETE allowed'; END IF;
  DELETE FROM push_subscriptions WHERE user_profile_id=profile_b; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>0 THEN RAISE EXCEPTION 'push_subscriptions cross-user DELETE allowed'; END IF;

  BEGIN INSERT INTO notification_deliveries(user_profile_id,push_subscription_id,intent,event_key,status,updated_at) VALUES(profile_a,sub_b,'ROUND_RESULT','mixed-owner','PENDING',now()); RAISE EXCEPTION 'mixed-owner delivery INSERT allowed'; EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;
ROLLBACK;
