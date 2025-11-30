/*
  # Fix Security Issues - Indexes

  1. Add Missing Foreign Key Indexes
    - Add index on guest_players.owner_user_id
    - Add index on lobby_players.guest_player_id
    - Add index on player_favorites.favorite_user_id

  2. Remove Unused Indexes
    - Remove unused indexes that are not being utilized

  3. Security
    - Improves query performance on foreign key lookups
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_guest_players_owner_user_id 
  ON guest_players(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_lobby_players_guest_player_id 
  ON lobby_players(guest_player_id);

CREATE INDEX IF NOT EXISTS idx_player_favorites_favorite_user_id 
  ON player_favorites(favorite_user_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_practice_lobbies_status;
DROP INDEX IF EXISTS idx_player_connections_requester;
DROP INDEX IF EXISTS idx_player_connections_addressee;
DROP INDEX IF EXISTS idx_profiles_assessment_complete;
DROP INDEX IF EXISTS idx_profiles_displayed_rating;
DROP INDEX IF EXISTS idx_paddle_pals_sender;
DROP INDEX IF EXISTS idx_paddle_pals_status;
