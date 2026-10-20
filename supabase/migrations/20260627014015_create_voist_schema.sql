/*
# Voist SNS App Schema

## Overview
Creates the full schema for Voist — an illustration + voice SNS platform where
illustrators post artwork and voice actors record audio to bring illustrations to life.

## New Tables

### profiles
User profiles linked to auth.users. Stores username, display name, avatar, bio,
and the user's role (illustrator, voice_actor, or both).

### illustrations
Artwork posts. Each row stores the image URL, title, description, and tags.
Denormalized counts (likes_count, voice_count) are kept for fast feed queries.

### voice_posts
Audio recordings attached to a specific illustration. Multiple users can submit
their own voice interpretation for the same illustration. Denormalized likes_count
for fast sorting.

### likes
Polymorphic likes table — a row can reference either an illustration OR a voice post
(enforced by a CHECK constraint). Unique constraints prevent double-liking.

### follows
User follow relationships. Prevents self-follows and duplicate follow rows.

## Storage
Two public Storage buckets are created:
- `illustrations` — for uploaded illustration image files
- `audio` — for uploaded or recorded audio files

## Security
RLS is enabled on all tables. Authenticated users:
- Can read all public illustrations, voice posts, and profiles
- Can only write/update/delete their own rows
The `user_id` column on illustrations and voice_posts defaults to auth.uid()
so frontend inserts do not need to supply the owner explicitly.

## Database Trigger
A trigger on auth.users automatically creates a skeleton profile row when a new
user signs up, using their email prefix as a default username.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  user_type text NOT NULL DEFAULT 'both' CHECK (user_type IN ('illustrator', 'voice_actor', 'both')),
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ILLUSTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS illustrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  tags text[] DEFAULT '{}',
  likes_count integer NOT NULL DEFAULT 0,
  voice_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS illustrations_user_id_idx ON illustrations(user_id);
CREATE INDEX IF NOT EXISTS illustrations_created_at_idx ON illustrations(created_at DESC);

ALTER TABLE illustrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_illustrations" ON illustrations;
CREATE POLICY "public_read_illustrations" ON illustrations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_illustration" ON illustrations;
CREATE POLICY "insert_own_illustration" ON illustrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_illustration" ON illustrations;
CREATE POLICY "update_own_illustration" ON illustrations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_illustration" ON illustrations;
CREATE POLICY "delete_own_illustration" ON illustrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- VOICE POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  illustration_id uuid NOT NULL REFERENCES illustrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  description text,
  audio_url text NOT NULL,
  duration float,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_posts_illustration_id_idx ON voice_posts(illustration_id);
CREATE INDEX IF NOT EXISTS voice_posts_user_id_idx ON voice_posts(user_id);

ALTER TABLE voice_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_voice_posts" ON voice_posts;
CREATE POLICY "public_read_voice_posts" ON voice_posts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_voice_post" ON voice_posts;
CREATE POLICY "insert_own_voice_post" ON voice_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_voice_post" ON voice_posts;
CREATE POLICY "update_own_voice_post" ON voice_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_voice_post" ON voice_posts;
CREATE POLICY "delete_own_voice_post" ON voice_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Increment voice_count on illustration when a voice post is created
CREATE OR REPLACE FUNCTION increment_voice_count()
RETURNS trigger AS $$
BEGIN
  UPDATE illustrations SET voice_count = voice_count + 1 WHERE id = NEW.illustration_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_voice_post_created ON voice_posts;
CREATE TRIGGER on_voice_post_created
  AFTER INSERT ON voice_posts
  FOR EACH ROW EXECUTE FUNCTION increment_voice_count();

CREATE OR REPLACE FUNCTION decrement_voice_count()
RETURNS trigger AS $$
BEGIN
  UPDATE illustrations SET voice_count = GREATEST(0, voice_count - 1) WHERE id = OLD.illustration_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_voice_post_deleted ON voice_posts;
CREATE TRIGGER on_voice_post_deleted
  AFTER DELETE ON voice_posts
  FOR EACH ROW EXECUTE FUNCTION decrement_voice_count();

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  illustration_id uuid REFERENCES illustrations(id) ON DELETE CASCADE,
  voice_post_id uuid REFERENCES voice_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT likes_target_check CHECK (
    (illustration_id IS NOT NULL AND voice_post_id IS NULL) OR
    (illustration_id IS NULL AND voice_post_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS likes_illustration_unique ON likes(user_id, illustration_id) WHERE illustration_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS likes_voice_post_unique ON likes(user_id, voice_post_id) WHERE voice_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_likes" ON likes;
CREATE POLICY "public_read_likes" ON likes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_like" ON likes;
CREATE POLICY "insert_own_like" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_like" ON likes;
CREATE POLICY "delete_own_like" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to maintain likes_count on illustrations
CREATE OR REPLACE FUNCTION update_illustration_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.illustration_id IS NOT NULL THEN
    UPDATE illustrations SET likes_count = likes_count + 1 WHERE id = NEW.illustration_id;
  ELSIF TG_OP = 'DELETE' AND OLD.illustration_id IS NOT NULL THEN
    UPDATE illustrations SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.illustration_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_illustration_like_change ON likes;
CREATE TRIGGER on_illustration_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_illustration_likes_count();

-- Trigger to maintain likes_count on voice_posts
CREATE OR REPLACE FUNCTION update_voice_post_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voice_post_id IS NOT NULL THEN
    UPDATE voice_posts SET likes_count = likes_count + 1 WHERE id = NEW.voice_post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.voice_post_id IS NOT NULL THEN
    UPDATE voice_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.voice_post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_voice_post_like_change ON likes;
CREATE TRIGGER on_voice_post_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_voice_post_likes_count();

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_follows" ON follows;
CREATE POLICY "public_read_follows" ON follows FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_follow" ON follows;
CREATE POLICY "insert_own_follow" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "delete_own_follow" ON follows;
CREATE POLICY "delete_own_follow" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Trigger to maintain follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON follows;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('illustrations', 'illustrations', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "public_read_illustrations_storage" ON storage.objects;
CREATE POLICY "public_read_illustrations_storage" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'illustrations');

DROP POLICY IF EXISTS "auth_upload_illustrations_storage" ON storage.objects;
CREATE POLICY "auth_upload_illustrations_storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'illustrations');

DROP POLICY IF EXISTS "auth_delete_illustrations_storage" ON storage.objects;
CREATE POLICY "auth_delete_illustrations_storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'illustrations');

DROP POLICY IF EXISTS "public_read_audio_storage" ON storage.objects;
CREATE POLICY "public_read_audio_storage" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "auth_upload_audio_storage" ON storage.objects;
CREATE POLICY "auth_upload_audio_storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio');

DROP POLICY IF EXISTS "auth_delete_audio_storage" ON storage.objects;
CREATE POLICY "auth_delete_audio_storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'audio');
