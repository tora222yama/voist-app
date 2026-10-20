-- Backfill missing profiles for existing auth users
INSERT INTO profiles (id, username, display_name, user_type)
SELECT
  u.id,
  regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g') || '_' || substr(u.id::text, 1, 4),
  split_part(u.email, '@', 1),
  'both'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
