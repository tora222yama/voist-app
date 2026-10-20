/*
# Fix Storage RLS Policies to Enforce File Ownership

## Problem
The previous storage policies for the `illustrations` and `audio` buckets
allowed ANY authenticated user to DELETE or UPDATE/overwrite files owned by
ANY other user. The policies only checked `bucket_id` but never checked file
ownership. This meant user A could delete or replace user B's uploaded images
and audio files.

## Fix
Replace the overly-permissive DELETE and UPDATE storage policies with
ownership-scoped policies that check the file path prefix.

Files are stored using the convention `<user_id>/<filename>`, so we can
enforce ownership by comparing the path prefix to `auth.uid()::text || '/'`.

## Changes
- DROP and recreate DELETE policies for `illustrations` and `audio` buckets
  to check ownership via path prefix.
- DROP and recreate UPDATE policies for `illustrations` and `audio` buckets
  to check ownership via path prefix.
- INSERT policies are also tightened to enforce that uploaded paths start
  with the authenticated user's ID (prevents uploading files under another
  user's folder).
- SELECT (public read) policies remain unchanged — files are intentionally
  public-readable.
*/

-- ============================================================
-- ILLUSTRATIONS BUCKET
-- ============================================================

-- SELECT (public read) — unchanged
DROP POLICY IF EXISTS "public_read_illustrations_storage" ON storage.objects;
CREATE POLICY "public_read_illustrations_storage" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'illustrations');

-- INSERT — must upload under own user_id folder
DROP POLICY IF EXISTS "auth_upload_illustrations_storage" ON storage.objects;
CREATE POLICY "auth_upload_illustrations_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'illustrations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE — only own files
DROP POLICY IF EXISTS "auth_update_illustrations_storage" ON storage.objects;
CREATE POLICY "auth_update_illustrations_storage" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'illustrations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'illustrations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — only own files
DROP POLICY IF EXISTS "auth_delete_illustrations_storage" ON storage.objects;
CREATE POLICY "auth_delete_illustrations_storage" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'illustrations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- AUDIO BUCKET
-- ============================================================

-- SELECT (public read) — unchanged
DROP POLICY IF EXISTS "public_read_audio_storage" ON storage.objects;
CREATE POLICY "public_read_audio_storage" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'audio');

-- INSERT — must upload under own user_id folder
DROP POLICY IF EXISTS "auth_upload_audio_storage" ON storage.objects;
CREATE POLICY "auth_upload_audio_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE — only own files
DROP POLICY IF EXISTS "auth_update_audio_storage" ON storage.objects;
CREATE POLICY "auth_update_audio_storage" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — only own files
DROP POLICY IF EXISTS "auth_delete_audio_storage" ON storage.objects;
CREATE POLICY "auth_delete_audio_storage" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );