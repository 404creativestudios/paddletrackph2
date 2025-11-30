/*
  # Fix Remaining Security Issues

  1. Add Missing Index
    - Add index on player_connections.addressee_id for foreign key lookup

  2. Keep New Indexes
    - The "unused" indexes were just created and will be used
    - They need time to accumulate usage statistics
    - Keep them for foreign key performance

  3. Fix Security Definer View
    - Recreate public_profiles view without SECURITY DEFINER
    - Add RLS policy to profiles table for public access

  4. Notes
    - Leaked Password Protection must be enabled in Supabase Dashboard
    - Cannot be configured via SQL migrations
*/

-- Add missing index for player_connections.addressee_id
CREATE INDEX IF NOT EXISTS idx_player_connections_addressee_id 
  ON player_connections(addressee_id);

-- Also ensure requester_id has an index for completeness
CREATE INDEX IF NOT EXISTS idx_player_connections_requester_id 
  ON player_connections(requester_id);

-- Drop and recreate public_profiles view without SECURITY DEFINER
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles AS
  SELECT 
    id,
    username,
    display_name,
    skill_level,
    city,
    bio,
    avatar_url,
    preferred_play_times,
    created_at
  FROM profiles
  WHERE is_profile_public = true;

-- Add RLS policy for public profile viewing
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (is_profile_public = true);

-- Grant select on public_profiles view
GRANT SELECT ON public_profiles TO anon;
GRANT SELECT ON public_profiles TO authenticated;
