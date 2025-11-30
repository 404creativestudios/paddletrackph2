/*
  # Create Paddle Pals System

  1. New Tables
    - `paddle_pals`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (text: pending, accepted, declined)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `paddle_pals` table
    - Add policies for users to:
      - View their own sent and received requests
      - Create new paddle pal requests
      - Update status of received requests
  
  3. Changes
    - Add location field to profiles (using existing city field)
    - Ensure profile_public field exists (already exists as is_profile_public)
*/

-- Create paddle_pals table
CREATE TABLE IF NOT EXISTS paddle_pals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_friend CHECK (sender_id != receiver_id),
  CONSTRAINT unique_friendship UNIQUE (sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE paddle_pals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sent and received paddle pal connections
CREATE POLICY "Users can view own paddle pal connections"
  ON paddle_pals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Policy: Users can send paddle pal requests
CREATE POLICY "Users can send paddle pal requests"
  ON paddle_pals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Policy: Users can update received paddle pal requests
CREATE POLICY "Users can update received requests"
  ON paddle_pals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_paddle_pals_sender ON paddle_pals(sender_id);
CREATE INDEX IF NOT EXISTS idx_paddle_pals_receiver ON paddle_pals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_paddle_pals_status ON paddle_pals(status);
