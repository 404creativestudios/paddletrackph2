-- TEST DATA SETUP SCRIPT
-- Run this script AFTER you've created the four test accounts through the UI:
-- 1. maria.santos@test.com (password123)
-- 2. juan.reyes@test.com (password123)
-- 3. sofia.garcia@test.com (password123)
-- 4. carlos.mendoza@test.com (password123)

-- First, get the user IDs (you'll need to replace these with actual IDs after signup)
-- Run this query first to get the user IDs:
/*
SELECT id, email FROM auth.users
WHERE email IN (
  'maria.santos@test.com',
  'juan.reyes@test.com',
  'sofia.garcia@test.com',
  'carlos.mendoza@test.com'
);
*/

-- IMPORTANT: Replace these UUIDs with the actual IDs from the query above
-- For now, we'll use variables (you'll need to substitute actual values)

DO $$
DECLARE
  maria_id uuid;
  juan_id uuid;
  sofia_id uuid;
  carlos_id uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO maria_id FROM auth.users WHERE email = 'maria.santos@test.com';
  SELECT id INTO juan_id FROM auth.users WHERE email = 'juan.reyes@test.com';
  SELECT id INTO sofia_id FROM auth.users WHERE email = 'sofia.garcia@test.com';
  SELECT id INTO carlos_id FROM auth.users WHERE email = 'carlos.mendoza@test.com';

  -- Update Maria's profile (Public, Hosting)
  UPDATE profiles SET
    username = 'maria_santos',
    display_name = 'Maria Santos',
    badge_name = 'Rising Star',
    skill_level = 'Intermediate',
    city = 'Manila',
    bio = 'Love playing pickleball on weekends! Always looking for new partners.',
    is_profile_public = true,
    self_assessed_level = 'intermediate',
    displayed_rating = 3.5,
    progress_percent = 45,
    self_assessment_complete = true,
    status = 'hosting_open_play',
    status_location = 'Marikina Sports Center',
    status_link = 'https://reclub.com/event/pickleball-open-play',
    status_updated_at = now() - interval '30 minutes'
  WHERE id = maria_id;

  -- Update Juan's profile (Public, Looking for partner)
  UPDATE profiles SET
    username = 'juan_reyes',
    display_name = 'Juan Reyes',
    badge_name = 'Ace Player',
    skill_level = 'Advanced',
    city = 'Quezon City',
    bio = 'Competitive player looking to improve my game.',
    is_profile_public = true,
    self_assessed_level = 'advanced',
    displayed_rating = 4.0,
    progress_percent = 75,
    self_assessment_complete = true,
    status = 'looking_partner',
    status_location = 'UP Diliman Courts',
    status_link = null,
    status_updated_at = now() - interval '1 hour'
  WHERE id = juan_id;

  -- Update Sofia's profile (Private, Looking for coach)
  UPDATE profiles SET
    username = 'sofia_garcia',
    display_name = 'Sofia Garcia',
    badge_name = 'Beginner Pro',
    skill_level = 'Beginner',
    city = 'Makati',
    bio = 'Just started playing pickleball and loving it!',
    is_profile_public = false,
    self_assessed_level = 'beginner',
    displayed_rating = 2.5,
    progress_percent = 20,
    self_assessment_complete = true,
    status = 'looking_coach',
    status_location = 'Bonifacio High Street',
    status_link = null,
    status_updated_at = now() - interval '2 hours'
  WHERE id = sofia_id;

  -- Update Carlos's profile (Public, Looking for court)
  UPDATE profiles SET
    username = 'carlos_mendoza',
    display_name = 'Carlos Mendoza',
    badge_name = 'Court Master',
    skill_level = 'Intermediate',
    city = 'Pasig',
    bio = 'Weekend warrior seeking regular play partners.',
    is_profile_public = true,
    self_assessed_level = 'intermediate',
    displayed_rating = 3.0,
    progress_percent = 90,
    self_assessment_complete = true,
    status = 'looking_court',
    status_location = 'Ortigas Area',
    status_link = null,
    status_updated_at = now() - interval '3 hours'
  WHERE id = carlos_id;

  -- Create Paddle Pal connections
  -- Maria <-> Juan
  INSERT INTO paddle_pals (sender_id, receiver_id, status, created_at, updated_at)
  VALUES (maria_id, juan_id, 'accepted', now() - interval '2 days', now() - interval '2 days')
  ON CONFLICT DO NOTHING;

  -- Maria <-> Sofia
  INSERT INTO paddle_pals (sender_id, receiver_id, status, created_at, updated_at)
  VALUES (maria_id, sofia_id, 'accepted', now() - interval '3 days', now() - interval '3 days')
  ON CONFLICT DO NOTHING;

  -- Juan <-> Carlos
  INSERT INTO paddle_pals (sender_id, receiver_id, status, created_at, updated_at)
  VALUES (juan_id, carlos_id, 'accepted', now() - interval '1 day', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

  -- Sofia <-> Carlos (pending request for testing)
  INSERT INTO paddle_pals (sender_id, receiver_id, status, created_at, updated_at)
  VALUES (sofia_id, carlos_id, 'pending', now() - interval '12 hours', now() - interval '12 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data setup complete!';
END $$;

-- Verify the setup
SELECT
  username,
  display_name,
  is_profile_public,
  status,
  status_location,
  EXTRACT(EPOCH FROM (now() - status_updated_at))/3600 as hours_since_update,
  displayed_rating,
  progress_percent
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY status_updated_at DESC;

-- Verify Paddle Pal connections
SELECT
  s.username as sender,
  r.username as receiver,
  pp.status,
  EXTRACT(EPOCH FROM (now() - pp.created_at))/86400 as days_ago
FROM paddle_pals pp
JOIN profiles s ON pp.sender_id = s.id
JOIN profiles r ON pp.receiver_id = r.id
WHERE s.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
   OR r.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY pp.created_at DESC;
