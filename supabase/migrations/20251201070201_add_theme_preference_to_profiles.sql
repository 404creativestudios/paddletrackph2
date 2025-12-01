/*
  # Add Theme Preference to Profiles

  1. Changes to profiles table
    - Add `theme_preference` column to store user's theme choice
    - Values: 'light', 'dark', or 'system' (default)
  
  2. Notes
    - Allows users to override system theme preference
    - Stored in database so it persists across devices
*/

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));
