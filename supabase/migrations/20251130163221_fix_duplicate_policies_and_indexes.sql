/*
  # Fix Duplicate Policies and Unused Indexes

  1. Fix Duplicate RLS Policies
    - Remove "Public profiles are viewable by everyone" policy
    - Keep "Anyone can view profiles" as it covers all cases
    - Simplifies policy management and removes the conflict

  2. Handle Unused Indexes
    - These indexes are needed for foreign key performance
    - Mark as "unused" only because they were just created
    - Keep them as they will be used for queries

  3. Security
    - Maintains proper access control
    - Improves query performance on foreign keys
*/

-- Remove duplicate SELECT policy that causes conflict
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Note: Keeping "Anyone can view profiles" policy which allows authenticated users
-- to view all profiles. This is the intended behavior for the app.

-- The following indexes are kept because they're essential for foreign key performance:
-- - idx_guest_players_owner_user_id (for guest_players.owner_user_id FK)
-- - idx_lobby_players_guest_player_id (for lobby_players.guest_player_id FK)
-- - idx_player_favorites_favorite_user_id (for player_favorites.favorite_user_id FK)
-- - idx_player_connections_addressee_id (for player_connections.addressee_id FK)
-- - idx_player_connections_requester_id (for player_connections.requester_id FK)
--
-- These will show usage statistics once queries start using them.
-- They are critical for JOIN performance and should NOT be removed.
