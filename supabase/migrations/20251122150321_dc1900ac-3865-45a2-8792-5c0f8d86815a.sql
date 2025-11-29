-- Add player_notes field to lobby_players for individual reflections
ALTER TABLE public.lobby_players 
ADD COLUMN player_notes text;

-- Create player_favorites table for bookmarking partners
CREATE TABLE public.player_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  favorite_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, favorite_user_id)
);

-- Enable RLS on player_favorites
ALTER TABLE public.player_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_favorites
CREATE POLICY "Users can view their own favorites"
ON public.player_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
ON public.player_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
ON public.player_favorites
FOR DELETE
USING (auth.uid() = user_id);