/*
  # Fix Null Teams in Lobby Players

  1. Updates
    - Set team to 'B' for all lobby players where team is NULL
    - This ensures all players are assigned to a team for proper game functionality

  2. Notes
    - Team B is chosen as default for simplicity
    - Existing team assignments are preserved
    - Only affects records with NULL team values
*/

UPDATE lobby_players
SET team = 'B'
WHERE team IS NULL;
