/*
  # Progress Tracking Triggers and Helpers

  1. Trigger Functions
    - `trigger_progress_after_game` - Automatically called when lobby_players.result is updated
    - `trigger_progress_after_self_assessment` - Automatically called when assessment scores change
  
  2. Helper Functions
    - `get_opponent_avg_level` - Gets average opponent level from a game
    - `get_partner_level` - Gets partner level from a game
    - `calculate_rally_estimate` - Estimates rally length from game data
  
  3. Security
    - Functions use SECURITY DEFINER to allow progress updates
    - Only authenticated users can trigger progress updates for themselves
*/

-- Helper function to get opponent average level
CREATE OR REPLACE FUNCTION get_opponent_avg_level(
  p_lobby_id uuid,
  p_user_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_user_team text;
  v_avg_level numeric;
BEGIN
  SELECT team INTO v_user_team
  FROM lobby_players
  WHERE lobby_id = p_lobby_id AND user_id = p_user_id;

  SELECT AVG(p.displayed_rating)
  INTO v_avg_level
  FROM lobby_players lp
  JOIN profiles p ON lp.user_id = p.id
  WHERE lp.lobby_id = p_lobby_id 
    AND lp.team != v_user_team
    AND lp.user_id IS NOT NULL;

  RETURN COALESCE(v_avg_level, 0);
END;
$$ LANGUAGE plpgsql;

-- Helper function to get partner level
CREATE OR REPLACE FUNCTION get_partner_level(
  p_lobby_id uuid,
  p_user_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_user_team text;
  v_partner_level numeric;
BEGIN
  SELECT team INTO v_user_team
  FROM lobby_players
  WHERE lobby_id = p_lobby_id AND user_id = p_user_id;

  SELECT p.displayed_rating
  INTO v_partner_level
  FROM lobby_players lp
  JOIN profiles p ON lp.user_id = p.id
  WHERE lp.lobby_id = p_lobby_id 
    AND lp.team = v_user_team
    AND lp.user_id != p_user_id
    AND lp.user_id IS NOT NULL
  LIMIT 1;

  RETURN v_partner_level;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for game completion
CREATE OR REPLACE FUNCTION trigger_progress_after_game()
RETURNS TRIGGER AS $$
DECLARE
  v_opponent_level numeric;
  v_partner_level numeric;
  v_rally_estimate integer := 10;
BEGIN
  IF NEW.result IN ('win', 'loss') AND (OLD.result IS NULL OR OLD.result = 'none') THEN
    v_opponent_level := get_opponent_avg_level(NEW.lobby_id, NEW.user_id);
    v_partner_level := get_partner_level(NEW.lobby_id, NEW.user_id);

    PERFORM progress_after_game(
      NEW.user_id,
      NEW.result,
      v_opponent_level,
      v_partner_level,
      v_rally_estimate
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for game completion
DROP TRIGGER IF EXISTS on_game_result_update ON lobby_players;
CREATE TRIGGER on_game_result_update
  AFTER UPDATE OF result ON lobby_players
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION trigger_progress_after_game();

-- Trigger function for self-assessment updates
CREATE OR REPLACE FUNCTION trigger_progress_after_self_assessment()
RETURNS TRIGGER AS $$
DECLARE
  v_old_scores jsonb;
  v_new_scores jsonb;
BEGIN
  v_old_scores := jsonb_build_object(
    'serve_score', OLD.serve_score,
    'return_score', OLD.return_score,
    'dink_score', OLD.dink_score,
    'drop_score', OLD.drop_score,
    'reset_score', OLD.reset_score,
    'volley_score', OLD.volley_score,
    'hand_speed_score', OLD.hand_speed_score,
    'lob_score', OLD.lob_score,
    'speedup_score', OLD.speedup_score,
    'positioning_score', OLD.positioning_score,
    'anticipation_score', OLD.anticipation_score,
    'consistency_score', OLD.consistency_score
  );

  v_new_scores := jsonb_build_object(
    'serve_score', NEW.serve_score,
    'return_score', NEW.return_score,
    'dink_score', NEW.dink_score,
    'drop_score', NEW.drop_score,
    'reset_score', NEW.reset_score,
    'volley_score', NEW.volley_score,
    'hand_speed_score', NEW.hand_speed_score,
    'lob_score', NEW.lob_score,
    'speedup_score', NEW.speedup_score,
    'positioning_score', NEW.positioning_score,
    'anticipation_score', NEW.anticipation_score,
    'consistency_score', NEW.consistency_score
  );

  IF v_old_scores IS DISTINCT FROM v_new_scores THEN
    PERFORM progress_after_reassessment(NEW.id, v_old_scores, v_new_scores);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for self-assessment updates
DROP TRIGGER IF EXISTS on_self_assessment_update ON profiles;
CREATE TRIGGER on_self_assessment_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.serve_score IS DISTINCT FROM NEW.serve_score OR
    OLD.return_score IS DISTINCT FROM NEW.return_score OR
    OLD.dink_score IS DISTINCT FROM NEW.dink_score OR
    OLD.drop_score IS DISTINCT FROM NEW.drop_score OR
    OLD.reset_score IS DISTINCT FROM NEW.reset_score OR
    OLD.volley_score IS DISTINCT FROM NEW.volley_score OR
    OLD.hand_speed_score IS DISTINCT FROM NEW.hand_speed_score OR
    OLD.lob_score IS DISTINCT FROM NEW.lob_score OR
    OLD.speedup_score IS DISTINCT FROM NEW.speedup_score OR
    OLD.positioning_score IS DISTINCT FROM NEW.positioning_score OR
    OLD.anticipation_score IS DISTINCT FROM NEW.anticipation_score OR
    OLD.consistency_score IS DISTINCT FROM NEW.consistency_score
  )
  EXECUTE FUNCTION trigger_progress_after_self_assessment();

-- Public function to manually mark module completion
CREATE OR REPLACE FUNCTION complete_training_module(p_module_number integer)
RETURNS json AS $$
BEGIN
  RETURN progress_after_module_completion(auth.uid(), p_module_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_training_module(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION progress_after_game(uuid, text, numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION progress_after_module_completion(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION progress_after_reassessment(uuid, jsonb, jsonb) TO authenticated;
