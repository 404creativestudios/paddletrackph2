-- Create coach waitlist table
CREATE TABLE public.coach_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist (public insert)
CREATE POLICY "Anyone can join coach waitlist"
  ON public.coach_waitlist FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view waitlist for admin purposes
CREATE POLICY "Authenticated users can view waitlist"
  ON public.coach_waitlist FOR SELECT
  TO authenticated
  USING (true);