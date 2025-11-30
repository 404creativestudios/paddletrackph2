-- TEST QUERIES FOR ACTIVITY FEED & STATUS SYSTEM
-- Run these queries to verify functionality

-- ========================================
-- 1. ACTIVITY FEED TESTS
-- ========================================

-- Test 1.1: Maria's Activity Feed View (should see public profiles + paddle pals)
WITH maria AS (
  SELECT id FROM profiles WHERE username = 'maria_santos'
),
maria_paddle_pals AS (
  SELECT
    CASE
      WHEN sender_id = (SELECT id FROM maria) THEN receiver_id
      WHEN receiver_id = (SELECT id FROM maria) THEN sender_id
    END as pal_id
  FROM paddle_pals
  WHERE (sender_id = (SELECT id FROM maria) OR receiver_id = (SELECT id FROM maria))
    AND status = 'accepted'
)
SELECT
  p.username,
  p.display_name,
  p.status,
  p.status_location,
  p.status_link,
  p.is_profile_public,
  CASE WHEN p.id IN (SELECT pal_id FROM maria_paddle_pals WHERE pal_id IS NOT NULL) THEN 'YES' ELSE 'NO' END as is_paddle_pal,
  ROUND(EXTRACT(EPOCH FROM (now() - p.status_updated_at))/3600, 1) as hours_ago
FROM profiles p
WHERE p.id != (SELECT id FROM maria)
  AND p.status IS NOT NULL
  AND p.status != 'none'
  AND p.status_updated_at >= now() - interval '72 hours'
  AND (p.is_profile_public = true OR p.id IN (SELECT pal_id FROM maria_paddle_pals WHERE pal_id IS NOT NULL))
ORDER BY
  CASE WHEN p.id IN (SELECT pal_id FROM maria_paddle_pals WHERE pal_id IS NOT NULL) THEN 0 ELSE 1 END,
  p.status_updated_at DESC;

-- Expected Results:
-- Should see: Juan (paddle pal, public), Sofia (paddle pal, private), Carlos (public, not pal)
-- Order: Juan first (paddle pal), then Carlos, then Sofia (or Sofia then Carlos based on timing)


-- Test 1.2: Carlos's Activity Feed View (should NOT see Sofia)
WITH carlos AS (
  SELECT id FROM profiles WHERE username = 'carlos_mendoza'
),
carlos_paddle_pals AS (
  SELECT
    CASE
      WHEN sender_id = (SELECT id FROM carlos) THEN receiver_id
      WHEN receiver_id = (SELECT id FROM carlos) THEN sender_id
    END as pal_id
  FROM paddle_pals
  WHERE (sender_id = (SELECT id FROM carlos) OR receiver_id = (SELECT id FROM carlos))
    AND status = 'accepted'
)
SELECT
  p.username,
  p.display_name,
  p.status,
  p.is_profile_public,
  CASE WHEN p.id IN (SELECT pal_id FROM carlos_paddle_pals WHERE pal_id IS NOT NULL) THEN 'YES' ELSE 'NO' END as is_paddle_pal
FROM profiles p
WHERE p.id != (SELECT id FROM carlos)
  AND p.status IS NOT NULL
  AND p.status != 'none'
  AND p.status_updated_at >= now() - interval '72 hours'
  AND (p.is_profile_public = true OR p.id IN (SELECT pal_id FROM carlos_paddle_pals WHERE pal_id IS NOT NULL))
ORDER BY
  CASE WHEN p.id IN (SELECT pal_id FROM carlos_paddle_pals WHERE pal_id IS NOT NULL) THEN 0 ELSE 1 END,
  p.status_updated_at DESC;

-- Expected Results:
-- Should see: Juan (paddle pal, public), Maria (public)
-- Should NOT see: Sofia (private, not connected)


-- ========================================
-- 2. PADDLE PALS TESTS
-- ========================================

-- Test 2.1: Get Maria's Paddle Pals with their status
WITH maria AS (
  SELECT id FROM profiles WHERE username = 'maria_santos'
)
SELECT
  p.username,
  p.display_name,
  p.status,
  p.status_location,
  p.status_updated_at,
  ROUND(EXTRACT(EPOCH FROM (now() - p.status_updated_at))/3600, 1) as hours_ago,
  p.is_profile_public
FROM profiles p
WHERE p.id IN (
  SELECT
    CASE
      WHEN sender_id = (SELECT id FROM maria) THEN receiver_id
      WHEN receiver_id = (SELECT id FROM maria) THEN sender_id
    END
  FROM paddle_pals
  WHERE (sender_id = (SELECT id FROM maria) OR receiver_id = (SELECT id FROM maria))
    AND status = 'accepted'
)
ORDER BY p.status_updated_at DESC NULLS LAST;

-- Expected Results:
-- Should see: Juan and Sofia (both are Maria's paddle pals)
-- Sorted by most recent status update


-- Test 2.2: Check all Paddle Pal connections
SELECT
  s.username as sender,
  r.username as receiver,
  pp.status as connection_status,
  pp.created_at
FROM paddle_pals pp
JOIN profiles s ON pp.sender_id = s.id
JOIN profiles r ON pp.receiver_id = r.id
WHERE s.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
   OR r.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY pp.created_at DESC;

-- Expected Results:
-- Maria <-> Juan: accepted
-- Maria <-> Sofia: accepted
-- Juan <-> Carlos: accepted
-- Sofia <-> Carlos: pending


-- ========================================
-- 3. STATUS EXPIRATION TESTS
-- ========================================

-- Test 3.1: Check status ages
SELECT
  username,
  status,
  status_updated_at,
  ROUND(EXTRACT(EPOCH FROM (now() - status_updated_at))/3600, 1) as hours_ago,
  CASE
    WHEN status_updated_at >= now() - interval '72 hours' THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status_state
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY status_updated_at DESC;


-- Test 3.2: Manually expire Carlos's status (for testing)
-- UNCOMMENT TO RUN:
-- UPDATE profiles
-- SET status_updated_at = now() - interval '73 hours'
-- WHERE username = 'carlos_mendoza';


-- Test 3.3: Simulate cleanup function (find expired statuses)
SELECT
  username,
  status,
  status_updated_at,
  ROUND(EXTRACT(EPOCH FROM (now() - status_updated_at))/3600, 1) as hours_ago
FROM profiles
WHERE status != 'none'
  AND status IS NOT NULL
  AND status_updated_at < now() - interval '72 hours';

-- This query shows which users would be cleaned up


-- Test 3.4: Run cleanup (reset expired statuses)
-- UNCOMMENT TO RUN:
-- UPDATE profiles
-- SET
--   status = 'none',
--   status_location = null,
--   status_link = null
-- WHERE status != 'none'
--   AND status IS NOT NULL
--   AND status_updated_at < now() - interval '72 hours'
-- RETURNING username, status;


-- ========================================
-- 4. PROGRESS & RATING TESTS
-- ========================================

-- Test 4.1: Check current progress and ratings
SELECT
  username,
  displayed_rating,
  progress_percent,
  badge_name,
  self_assessment_complete
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY displayed_rating DESC;


-- Test 4.2: Simulate progress increase (game recording)
-- Example: Maria records a game and gains 15% progress
-- UNCOMMENT TO RUN:
-- UPDATE profiles
-- SET progress_percent = progress_percent + 15
-- WHERE username = 'maria_santos'
-- RETURNING username, displayed_rating, progress_percent;


-- Test 4.3: Simulate crossing 100% progress (rating increase)
-- Example: Carlos is at 90%, add 25% to cross 100%
-- UNCOMMENT TO RUN:
-- UPDATE profiles
-- SET
--   displayed_rating = displayed_rating + 0.5,
--   progress_percent = (progress_percent + 25) - 100
-- WHERE username = 'carlos_mendoza' AND progress_percent + 25 >= 100
-- RETURNING username, displayed_rating, progress_percent;


-- ========================================
-- 5. DASHBOARD DATA TESTS
-- ========================================

-- Test 5.1: Get complete dashboard data for Maria
WITH maria AS (
  SELECT id FROM profiles WHERE username = 'maria_santos'
),
maria_stats AS (
  SELECT
    COUNT(*) as total_games,
    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
  FROM lobby_players lp
  JOIN practice_lobbies pl ON lp.lobby_id = pl.id
  WHERE lp.user_id = (SELECT id FROM maria)
    AND pl.status = 'completed'
),
active_pals AS (
  SELECT COUNT(*) as active_pal_count
  FROM profiles p
  WHERE p.id IN (
    SELECT
      CASE
        WHEN sender_id = (SELECT id FROM maria) THEN receiver_id
        WHEN receiver_id = (SELECT id FROM maria) THEN sender_id
      END
    FROM paddle_pals
    WHERE (sender_id = (SELECT id FROM maria) OR receiver_id = (SELECT id FROM maria))
      AND status = 'accepted'
  )
  AND p.status != 'none'
  AND p.status IS NOT NULL
  AND p.status_updated_at >= now() - interval '4 hours'
)
SELECT
  p.username,
  p.display_name,
  p.displayed_rating,
  p.badge_name,
  p.progress_percent,
  p.status,
  p.status_location,
  p.status_link,
  p.status_updated_at,
  s.total_games,
  s.wins,
  s.losses,
  CASE WHEN s.total_games > 0 THEN ROUND((s.wins::numeric / s.total_games) * 100) ELSE 0 END as win_rate,
  a.active_pal_count
FROM profiles p, maria_stats s, active_pals a
WHERE p.id = (SELECT id FROM maria);


-- ========================================
-- 6. FILTER TESTS
-- ========================================

-- Test 6.1: Filter by "Hosting" status
SELECT username, status, status_location
FROM profiles
WHERE status = 'hosting_open_play'
  AND status_updated_at >= now() - interval '72 hours'
  AND is_profile_public = true;

-- Test 6.2: Filter by "Looking for partner" status
SELECT username, status, status_location
FROM profiles
WHERE status = 'looking_partner'
  AND status_updated_at >= now() - interval '72 hours'
  AND is_profile_public = true;

-- Test 6.3: Filter by "Looking for coach" status
SELECT username, status, status_location
FROM profiles
WHERE status = 'looking_coach'
  AND status_updated_at >= now() - interval '72 hours'
  AND is_profile_public = true;

-- Test 6.4: Filter by "Looking for court" status
SELECT username, status, status_location
FROM profiles
WHERE status = 'looking_court'
  AND status_updated_at >= now() - interval '72 hours'
  AND is_profile_public = true;


-- ========================================
-- 7. PENDING REQUESTS TEST
-- ========================================

-- Test 7.1: Get Carlos's pending Paddle Pal requests
SELECT
  s.username as from_user,
  'carlos_mendoza' as to_user,
  pp.status,
  pp.created_at
FROM paddle_pals pp
JOIN profiles s ON pp.sender_id = s.id
WHERE pp.receiver_id = (SELECT id FROM profiles WHERE username = 'carlos_mendoza')
  AND pp.status = 'pending';

-- Expected: Should see request from Sofia


-- ========================================
-- 8. NOTIFICATION TESTS
-- ========================================

-- Test 8.1: Check if Maria should see "Paddle Pals are active" notification
WITH maria AS (
  SELECT id FROM profiles WHERE username = 'maria_santos'
),
maria_pals AS (
  SELECT
    CASE
      WHEN sender_id = (SELECT id FROM maria) THEN receiver_id
      WHEN receiver_id = (SELECT id FROM maria) THEN sender_id
    END as pal_id
  FROM paddle_pals
  WHERE (sender_id = (SELECT id FROM maria) OR receiver_id = (SELECT id FROM maria))
    AND status = 'accepted'
)
SELECT
  COUNT(*) as active_pals_in_last_4_hours,
  CASE
    WHEN COUNT(*) > 0 THEN 'SHOW_NOTIFICATION'
    ELSE 'NO_NOTIFICATION'
  END as notification_status
FROM profiles
WHERE id IN (SELECT pal_id FROM maria_pals WHERE pal_id IS NOT NULL)
  AND status != 'none'
  AND status IS NOT NULL
  AND status_updated_at >= now() - interval '4 hours';

-- Expected: If Juan or Sofia updated status in last 4 hours, show notification


-- ========================================
-- SUMMARY REPORT
-- ========================================

SELECT
  '=== USER PROFILES ===' as section,
  null as username,
  null as value
UNION ALL
SELECT
  'Profile',
  username,
  display_name || ' | Rating: ' || displayed_rating || ' | Progress: ' || progress_percent || '% | Public: ' || is_profile_public
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
UNION ALL
SELECT
  '=== STATUSES ===' as section,
  null,
  null
UNION ALL
SELECT
  'Status',
  username,
  status || ' at ' || status_location || ' | ' || ROUND(EXTRACT(EPOCH FROM (now() - status_updated_at))/3600, 1) || ' hours ago'
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
  AND status != 'none'
UNION ALL
SELECT
  '=== PADDLE PAL CONNECTIONS ===' as section,
  null,
  null
UNION ALL
SELECT
  'Connection',
  s.username,
  '↔ ' || r.username || ' (' || pp.status || ')'
FROM paddle_pals pp
JOIN profiles s ON pp.sender_id = s.id
JOIN profiles r ON pp.receiver_id = r.id
WHERE s.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
   OR r.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza');
