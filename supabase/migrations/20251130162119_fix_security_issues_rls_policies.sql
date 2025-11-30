/*
  # Fix Security Issues - RLS Policies

  1. Update RLS Policies
    - Replace auth.uid() with (SELECT auth.uid()) in all policies
    - This prevents re-evaluation on each row for better performance

  2. Tables Updated
    - profiles
    - player_favorites
    - guest_players
    - player_connections
    - paddle_pals
    - training_modules

  3. Security
    - Maintains same security while improving performance at scale
*/

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Fix player_favorites table policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON player_favorites;
CREATE POLICY "Users can view their own favorites"
  ON player_favorites FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can add their own favorites" ON player_favorites;
CREATE POLICY "Users can add their own favorites"
  ON player_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can remove their own favorites" ON player_favorites;
CREATE POLICY "Users can remove their own favorites"
  ON player_favorites FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix guest_players table policies
DROP POLICY IF EXISTS "Users can view own guest players" ON guest_players;
CREATE POLICY "Users can view own guest players"
  ON guest_players FOR SELECT
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own guest players" ON guest_players;
CREATE POLICY "Users can create own guest players"
  ON guest_players FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own guest players" ON guest_players;
CREATE POLICY "Users can update own guest players"
  ON guest_players FOR UPDATE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own guest players" ON guest_players;
CREATE POLICY "Users can delete own guest players"
  ON guest_players FOR DELETE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- Fix player_connections table policies
DROP POLICY IF EXISTS "Users can view own connections" ON player_connections;
CREATE POLICY "Users can view own connections"
  ON player_connections FOR SELECT
  TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR addressee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create connection requests" ON player_connections;
CREATE POLICY "Users can create connection requests"
  ON player_connections FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update received connection requests" ON player_connections;
CREATE POLICY "Users can update received connection requests"
  ON player_connections FOR UPDATE
  TO authenticated
  USING (addressee_id = (SELECT auth.uid()))
  WITH CHECK (addressee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own connections" ON player_connections;
CREATE POLICY "Users can delete own connections"
  ON player_connections FOR DELETE
  TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR addressee_id = (SELECT auth.uid()));

-- Fix paddle_pals table policies
DROP POLICY IF EXISTS "Users can view own paddle pal connections" ON paddle_pals;
CREATE POLICY "Users can view own paddle pal connections"
  ON paddle_pals FOR SELECT
  TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can send paddle pal requests" ON paddle_pals;
CREATE POLICY "Users can send paddle pal requests"
  ON paddle_pals FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update received requests" ON paddle_pals;
CREATE POLICY "Users can update received requests"
  ON paddle_pals FOR UPDATE
  TO authenticated
  USING (receiver_id = (SELECT auth.uid()))
  WITH CHECK (receiver_id = (SELECT auth.uid()));

-- Fix training_modules table policies
DROP POLICY IF EXISTS "Users can view own modules" ON training_modules;
CREATE POLICY "Users can view own modules"
  ON training_modules FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own modules" ON training_modules;
CREATE POLICY "Users can insert own modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own modules" ON training_modules;
CREATE POLICY "Users can update own modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
