/*
  # Progress Tracking System

  1. New Tables
    - `training_modules` - Tracks user module completion status
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `module_number` (integer, 1-5)
      - `completed` (boolean)
      - `completed_at` (timestamp)
    
  2. Functions
    - `progress_after_game` - Updates progress when a game is logged
    - `progress_after_module_completion` - Updates progress when a module is completed
    - `progress_after_reassessment` - Updates progress when self-assessment is updated
    - `level_up_user` - Handles level up logic and training program regeneration
    - `update_badge_name` - Updates badge based on displayed rating

  3. Security
    - Enable RLS on training_modules table
    - Add policies for users to manage their own modules
*/

-- Create training_modules table
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_number integer NOT NULL CHECK (module_number BETWEEN 1 AND 5),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_number)
);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own modules"
  ON training_modules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update badge name based on rating
CREATE OR REPLACE FUNCTION update_badge_name(p_displayed_rating numeric)
RETURNS text AS $$
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

-- Function to handle level up
CREATE OR REPLACE FUNCTION level_up_user(p_user_id uuid)
RETURNS void AS $$
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

-- Function: progress_after_game
CREATE OR REPLACE FUNCTION progress_after_game(
  p_user_id uuid,
  p_game_result text,
  p_opponent_level numeric DEFAULT NULL,
  p_partner_level numeric DEFAULT NULL,
  p_rally_length integer DEFAULT NULL
)
RETURNS json AS $$
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

-- Function: progress_after_module_completion
CREATE OR REPLACE FUNCTION progress_after_module_completion(
  p_user_id uuid,
  p_module_number integer
)
RETURNS json AS $$
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

-- Function: progress_after_reassessment
CREATE OR REPLACE FUNCTION progress_after_reassessment(
  p_user_id uuid,
  p_old_scores jsonb,
  p_new_scores jsonb
)
RETURNS json AS $$
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
