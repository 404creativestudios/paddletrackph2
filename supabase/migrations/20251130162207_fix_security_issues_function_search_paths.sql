/*
  # Fix Security Issues - Function Search Paths

  1. Update Function Definitions
    - Add SET search_path = public to all functions
    - This prevents potential security issues from mutable search paths

  2. Functions Updated
    - update_badge_name
    - level_up_user
    - progress_after_game
    - progress_after_module_completion
    - progress_after_reassessment
    - get_opponent_avg_level
    - get_partner_level
    - trigger_progress_after_game
    - trigger_progress_after_self_assessment
    - complete_training_module

  3. Security
    - Protects against search_path manipulation attacks
*/

-- Update badge name function
CREATE OR REPLACE FUNCTION update_badge_name(p_displayed_rating numeric)
RETURNS text 
SET search_path = public
AS $$
BEGIN
  IF p_displayed_rating < 2.5 THEN
    RETURN 'Starter';
  ELSIF p_displayed_rating = 2.5 THEN
    RETURN 'Getting There';
  ELSIF p_displayed_rating = 3.0 THEN
    RETURN 'Intermediate';
  ELSIF p_displayed_rating = 3.5 THEN
    RETURN 'Leveling Up';
  ELSIF p_displayed_rating = 4.0 THEN
    RETURN 'Advanced';
  ELSIF p_displayed_rating = 4.5 THEN
    RETURN 'Elite';
  ELSIF p_displayed_rating >= 5.0 THEN
    RETURN 'Expert';
  ELSE
    RETURN 'Starter';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Level up user function
CREATE OR REPLACE FUNCTION level_up_user(p_user_id uuid)
RETURNS void 
SET search_path = public
AS $$
DECLARE
  v_new_rating numeric;
  v_new_badge text;
BEGIN
  UPDATE profiles
  SET 
    displayed_rating = displayed_rating + 0.5,
    progress_percent = 0
  WHERE id = p_user_id
  RETURNING displayed_rating INTO v_new_rating;

  v_new_badge := update_badge_name(v_new_rating);

  UPDATE profiles
  SET badge_name = v_new_badge
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Progress after game function
CREATE OR REPLACE FUNCTION progress_after_game(
  p_user_id uuid,
  p_game_result text,
  p_opponent_level numeric DEFAULT NULL,
  p_partner_level numeric DEFAULT NULL,
  p_rally_length integer DEFAULT NULL
)
RETURNS json 
SET search_path = public
AS $$
DECLARE
  v_base_increase integer;
  v_total_increase integer;
  v_current_progress integer;
  v_user_rating numeric;
  v_new_progress integer;
  v_leveled_up boolean := false;
BEGIN
  SELECT progress_percent, displayed_rating
  INTO v_current_progress, v_user_rating
  FROM profiles
  WHERE id = p_user_id;

  IF p_game_result = 'win' THEN
    v_base_increase := 8;
  ELSE
    v_base_increase := 4;
  END IF;

  v_total_increase := v_base_increase;

  IF p_rally_length IS NOT NULL AND p_rally_length > 10 THEN
    v_total_increase := v_total_increase + 2;
  END IF;

  IF p_opponent_level IS NOT NULL AND p_opponent_level > v_user_rating THEN
    v_total_increase := v_total_increase + 2;
  END IF;

  IF p_partner_level IS NOT NULL AND p_partner_level < v_user_rating THEN
    v_total_increase := v_total_increase + 2;
  END IF;

  v_new_progress := LEAST(v_current_progress + v_total_increase, 100);

  UPDATE profiles
  SET progress_percent = v_new_progress
  WHERE id = p_user_id;

  IF v_new_progress >= 100 THEN
    PERFORM level_up_user(p_user_id);
    v_leveled_up := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'progress_increase', v_total_increase,
    'new_progress', v_new_progress,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Progress after module completion function
CREATE OR REPLACE FUNCTION progress_after_module_completion(
  p_user_id uuid,
  p_module_number integer
)
RETURNS json 
SET search_path = public
AS $$
DECLARE
  v_module_increase integer := 25;
  v_current_progress integer;
  v_new_progress integer;
  v_leveled_up boolean := false;
BEGIN
  SELECT progress_percent
  INTO v_current_progress
  FROM profiles
  WHERE id = p_user_id;

  v_new_progress := LEAST(v_current_progress + v_module_increase, 100);

  UPDATE profiles
  SET progress_percent = v_new_progress
  WHERE id = p_user_id;

  INSERT INTO training_modules (user_id, module_number, completed, completed_at)
  VALUES (p_user_id, p_module_number, true, now())
  ON CONFLICT (user_id, module_number)
  DO UPDATE SET 
    completed = true,
    completed_at = now();

  IF v_new_progress >= 100 THEN
    PERFORM level_up_user(p_user_id);
    v_leveled_up := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'progress_increase', v_module_increase,
    'new_progress', v_new_progress,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Progress after reassessment function
CREATE OR REPLACE FUNCTION progress_after_reassessment(
  p_user_id uuid,
  p_old_scores jsonb,
  p_new_scores jsonb
)
RETURNS json 
SET search_path = public
AS $$
DECLARE
  v_improvement_increase integer := 15;
  v_current_progress integer;
  v_new_progress integer;
  v_has_improvement boolean := false;
  v_leveled_up boolean := false;
  v_score_key text;
  v_old_value integer;
  v_new_value integer;
BEGIN
  SELECT progress_percent
  INTO v_current_progress
  FROM profiles
  WHERE id = p_user_id;

  FOR v_score_key IN SELECT jsonb_object_keys(p_new_scores)
  LOOP
    v_old_value := (p_old_scores->>v_score_key)::integer;
    v_new_value := (p_new_scores->>v_score_key)::integer;
    
    IF v_new_value > v_old_value THEN
      v_has_improvement := true;
      EXIT;
    END IF;
  END LOOP;

  IF v_has_improvement THEN
    v_new_progress := LEAST(v_current_progress + v_improvement_increase, 100);

    UPDATE profiles
    SET progress_percent = v_new_progress
    WHERE id = p_user_id;

    IF v_new_progress >= 100 THEN
      PERFORM level_up_user(p_user_id);
      v_leveled_up := true;
    END IF;

    RETURN json_build_object(
      'success', true,
      'progress_increase', v_improvement_increase,
      'new_progress', v_new_progress,
      'leveled_up', v_leveled_up
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'progress_increase', 0,
      'new_progress', v_current_progress,
      'leveled_up', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get opponent average level function
CREATE OR REPLACE FUNCTION get_opponent_avg_level(
  p_lobby_id uuid,
  p_user_id uuid
)
RETURNS numeric 
SET search_path = public
AS $$
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

-- Get partner level function
CREATE OR REPLACE FUNCTION get_partner_level(
  p_lobby_id uuid,
  p_user_id uuid
)
RETURNS numeric 
SET search_path = public
AS $$
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

-- Trigger progress after game function
CREATE OR REPLACE FUNCTION trigger_progress_after_game()
RETURNS TRIGGER 
SET search_path = public
AS $$
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

-- Trigger progress after self assessment function
CREATE OR REPLACE FUNCTION trigger_progress_after_self_assessment()
RETURNS TRIGGER 
SET search_path = public
AS $$
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

-- Complete training module function
CREATE OR REPLACE FUNCTION complete_training_module(p_module_number integer)
RETURNS json 
SET search_path = public
AS $$
BEGIN
  RETURN progress_after_module_completion(auth.uid(), p_module_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
