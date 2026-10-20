/*
# Fix PostgREST relationships and sign-up trigger

## Problems
1. `illustrations.user_id` and `voice_posts.user_id` (and likes/follows) referenced
   `auth.users` which is in a different schema. PostgREST only detects FK relationships
   between tables in the same schema (`public`), so `.select('*, profiles(*)')` failed
   with "Could not find a relationship".

2. The `handle_new_user` trigger inserted into `profiles` using the raw username from
   metadata. If that username was already taken (unique constraint), the INSERT threw,
   rolling back the entire auth.users INSERT and returning "Database error saving new user".

## Changes
- Re-point `user_id` FKs on `illustrations`, `voice_posts`, `likes` to `profiles(id)`
  instead of `auth.users(id)`. PostgREST can now auto-detect the relationship.
- Re-point `follower_id` / `following_id` on `follows` to `profiles(id)`.
- Update `handle_new_user` trigger to handle username collisions gracefully (appends
  a numeric suffix) and include `user_type` from metadata.
*/

-- ============================================================
-- 1. Retarget user_id FKs to profiles instead of auth.users
-- ============================================================

ALTER TABLE illustrations
  DROP CONSTRAINT illustrations_user_id_fkey,
  ADD CONSTRAINT illustrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE voice_posts
  DROP CONSTRAINT voice_posts_user_id_fkey,
  ADD CONSTRAINT voice_posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE likes
  DROP CONSTRAINT likes_user_id_fkey,
  ADD CONSTRAINT likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows
  DROP CONSTRAINT follows_follower_id_fkey,
  DROP CONSTRAINT follows_following_id_fkey,
  ADD CONSTRAINT follows_follower_id_fkey
    FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT follows_following_id_fkey
    FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Fix sign-up trigger: handle username collisions + user_type
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_base     text;
  v_username text;
  v_suffix   int := 0;
BEGIN
  v_base := COALESCE(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g')
  );
  -- Clamp to 30 chars
  v_base := left(v_base, 30);
  v_username := v_base;

  -- Resolve collisions by appending incrementing suffix
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
    v_suffix   := v_suffix + 1;
    v_username := left(v_base, 28) || v_suffix::text;
  END LOOP;

  INSERT INTO profiles (id, username, display_name, user_type)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_base),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'both')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (in case it pointed to the old function body)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
