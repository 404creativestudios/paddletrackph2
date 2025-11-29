-- Create guest_players table for local player entries
CREATE TABLE public.guest_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  skill_level text,
  city text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on guest_players
ALTER TABLE public.guest_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own guest players
CREATE POLICY "Users can view own guest players"
  ON public.guest_players FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create own guest players"
  ON public.guest_players FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own guest players"
  ON public.guest_players FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own guest players"
  ON public.guest_players FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Modify lobby_players to support guest players
ALTER TABLE public.lobby_players 
  ADD COLUMN guest_player_id uuid REFERENCES public.guest_players(id) ON DELETE SET NULL;

-- Make user_id nullable since guest players won't have one
ALTER TABLE public.lobby_players 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: must have either user_id OR guest_player_id (not both, not neither)
ALTER TABLE public.lobby_players 
  ADD CONSTRAINT player_type_check 
  CHECK (
    (user_id IS NOT NULL AND guest_player_id IS NULL) OR 
    (user_id IS NULL AND guest_player_id IS NOT NULL)
  );