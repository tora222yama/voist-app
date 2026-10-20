/*
  Bulletproof handle_new_user trigger.

  Root cause of "Database error saving new user":
  - Any unhandled exception inside the trigger causes the entire
    auth.users INSERT to roll back.
  - The previous version could still fail if the generated username
    was empty (e.g. email prefix was all dots/special chars) or if an
    unexpected constraint was hit.

  Fix:
  - Wrap the profile INSERT in a nested BEGIN/EXCEPTION block so that
    NO profile-creation error can ever block auth signup.
  - Sanitize the username base to guarantee at least one alnum char.
  - Always store user_type = 'both' (UI no longer shows role picker).
*/
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_base     text;
  v_username text;
  v_suffix   int := 0;
BEGIN
  BEGIN   -- inner block: errors here must not propagate to auth
    -- Build a safe username base
    v_base := regexp_replace(
      COALESCE(
        NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')), ''),
        split_part(NEW.email, '@', 1),
        'user'
      ),
      '[^a-zA-Z0-9_]', '_', 'g'
    );
    -- Remove leading/trailing underscores, clamp length
    v_base := btrim(left(v_base, 28), '_');
    -- Final safety: if empty after sanitize, use 'user'
    IF v_base IS NULL OR length(v_base) = 0 THEN
      v_base := 'user';
    END IF;

    v_username := v_base;
    -- Resolve username collisions
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
      v_suffix   := v_suffix + 1;
      v_username := v_base || v_suffix::text;
    END LOOP;

    INSERT INTO profiles (id, username, display_name, user_type)
    VALUES (
      NEW.id,
      v_username,
      COALESCE(
        NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), ''),
        v_base
      ),
      'both'
    )
    ON CONFLICT (id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    -- Profile creation failed for an unknown reason.
    -- Log to pg_log but never block the auth signup.
    RAISE WARNING 'handle_new_user: profile insert failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger binding (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
