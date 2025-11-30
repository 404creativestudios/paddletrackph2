/*
  # Add Status Fields to Profiles

  1. New Columns
    - status (text) - User's current status
    - status_updated_at (timestamptz) - When status was last updated
    - status_location (text) - Location associated with status
    - status_link (text) - Link for hosting events (Reclub, etc)

  2. Changes
    - Add status-related columns to profiles table
    - Set default status to 'none'
    - Add index on status_updated_at for efficient querying
    - Add index on status for filtering

  3. Security
    - RLS policies already exist for profiles table
    - Public profiles will show status in activity feed
    - Private profiles only show to Paddle Pals
*/

-- Add status fields to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_updated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status_location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status_link'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_link text;
  END IF;
END $$;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_status_updated_at 
  ON profiles(status_updated_at DESC) 
  WHERE status IS NOT NULL AND status != 'none';

CREATE INDEX IF NOT EXISTS idx_profiles_status 
  ON profiles(status) 
  WHERE status IS NOT NULL AND status != 'none';

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
      CHECK (status IN (
        'none',
        'looking_partner',
        'looking_one_more',
        'hosting_open_play',
        'looking_open_play',
        'looking_coach',
        'looking_court'
      ));
  END IF;
END $$;
