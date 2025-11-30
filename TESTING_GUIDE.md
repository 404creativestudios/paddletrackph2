# Activity Feed & Status Testing Guide

## Test User Accounts

Since Supabase Auth requires proper signup flows, please create four test accounts manually:

### User 1: Maria Santos (Public, Hosting)
- **Email:** maria.santos@test.com
- **Password:** password123
- **Setup Instructions:**
  1. Sign up with above credentials
  2. Set username: `maria_santos`
  3. Set display name: `Maria Santos`
  4. Complete self-assessment as Intermediate
  5. Set profile to PUBLIC
  6. Update status to "Hosting open play"
  7. Location: "Marikina Sports Center"
  8. Link: "https://reclub.com/event/pickleball-open-play"

### User 2: Juan Reyes (Public, Looking for Partner)
- **Email:** juan.reyes@test.com
- **Password:** password123
- **Setup Instructions:**
  1. Sign up with above credentials
  2. Set username: `juan_reyes`
  3. Set display name: `Juan Reyes`
  4. Complete self-assessment as Advanced
  5. Set profile to PUBLIC
  6. Update status to "Looking for partner"
  7. Location: "UP Diliman Courts"

### User 3: Sofia Garcia (Private, Looking for Coach)
- **Email:** sofia.garcia@test.com
- **Password:** password123
- **Setup Instructions:**
  1. Sign up with above credentials
  2. Set username: `sofia_garcia`
  3. Set display name: `Sofia Garcia`
  4. Complete self-assessment as Beginner
  5. Set profile to PRIVATE
  6. Update status to "Looking for coach"
  7. Location: "Bonifacio High Street"

### User 4: Carlos Mendoza (Public, Looking for Court)
- **Email:** carlos.mendoza@test.com
- **Password:** password123
- **Setup Instructions:**
  1. Sign up with above credentials
  2. Set username: `carlos_mendoza`
  3. Set display name: `Carlos Mendoza`
  4. Complete self-assessment as Intermediate
  5. Set profile to PUBLIC
  6. Update status to "Looking for court"
  7. Location: "Ortigas Area"

---

## Test Scenarios

### 1. Activity Feed Test

**Test 1.1: Public Profile Visibility**
- Log in as Maria Santos
- Navigate to Activity Feed
- **Expected:** See Juan Reyes and Carlos Mendoza (public profiles with active status)
- **Expected:** Do NOT see Sofia Garcia (private profile, not a Paddle Pal)

**Test 1.2: Event Link Button**
- Find Maria Santos in the Activity Feed
- **Expected:** See "View Event" button
- Click button
- **Expected:** Opens https://reclub.com/event/pickleball-open-play in new tab

**Test 1.3: Status Order**
- View Activity Feed as any user
- **Expected:** Users sorted by status_updated_at (most recent first)
- **Expected:** Order should be: Juan (30m ago) → Maria (1h ago) → Sofia (2h, if visible) → Carlos (3h ago)

**Test 1.4: Filter Tests**
- Click "Hosting" filter
  - **Expected:** Only Maria Santos appears
- Click "Looking to play" filter
  - **Expected:** No results (no one has this status)
- Click "Looking for partner" filter
  - **Expected:** Only Juan Reyes appears
- Click "Looking for coach" filter
  - **Expected:** Only Sofia Garcia if you're her Paddle Pal, otherwise empty
- Click "Looking for court" filter
  - **Expected:** Only Carlos Mendoza appears
- Click "Paddle Pals" filter
  - **Expected:** Only connected Paddle Pals appear

---

### 2. Paddle Pals Test

**Test 2.1: Create Paddle Pal Connections**
- Log in as Maria Santos
- Search for Juan Reyes
- Send Paddle Pal request
- Log in as Juan Reyes
- Accept request
- Repeat: Maria ↔ Sofia, Juan ↔ Carlos

**Test 2.2: Paddle Pals Priority in Feed**
- Log in as Maria Santos
- Navigate to Activity Feed
- **Expected:** Juan Reyes appears FIRST (Paddle Pal)
- **Expected:** Carlos and others appear after

**Test 2.3: Private Profile Visibility**
- Log in as Maria Santos (who is connected to Sofia)
- Navigate to Activity Feed
- **Expected:** Sofia Garcia appears (private but connected)
- Log in as Carlos Mendoza (NOT connected to Sofia)
- Navigate to Activity Feed
- **Expected:** Sofia Garcia does NOT appear

**Test 2.4: Paddle Pals List Shows Expired Status**
- Wait 72+ hours OR manually set Sofia's status_updated_at to 4 days ago
- Log in as Maria Santos
- Navigate to Paddle Pals list
- **Expected:** Sofia still appears with her old status
- Navigate to Activity Feed
- **Expected:** Sofia does NOT appear (expired)

---

### 3. Game Recording Test

**Test 3.1: Record a Game**
- Log in as Maria Santos
- Start a new game
- Record game with:
  - Result: Win
  - Rally length: 15
  - Opponent rating: 3.5
- Complete game
- **Expected:** Game saved to lobby_players table
- **Expected:** progress_percent increases by appropriate amount

**Test 3.2: Progress Bar Update**
- Check Maria's current progress_percent (was 45%)
- Record one game
- **Expected:** Progress increases (e.g., 45% → 55%)
- Check dashboard
- **Expected:** Progress bar reflects new percentage

**Test 3.3: Rating Increase on 100% Progress**
- Log in as Carlos Mendoza (progress at 90%)
- Record multiple games until progress exceeds 100%
- **Expected:** displayed_rating increases by 0.5 (3.0 → 3.5)
- **Expected:** progress_percent resets to remaining amount (e.g., 110% → 10%)
- **Expected:** Badge updates if threshold crossed

---

### 4. Game Scheduling Test

**Test 4.1: Schedule a Game**
- Log in as Maria Santos
- Navigate to "Schedule a Game"
- Fill in:
  - Date/Time: Tomorrow at 3 PM
  - Location: "Marikina Sports Center"
  - Match format: "Doubles"
  - Invite: Juan Reyes
- Submit
- **Expected:** Game created with is_scheduled = true

**Test 4.2: Invited Player Sees Game**
- Log in as Juan Reyes
- Check dashboard
- **Expected:** Scheduled game appears under "Scheduled" section
- **Expected:** Shows date, time, location

**Test 4.3: Dashboard Indicator**
- Log in as Maria Santos
- Check dashboard
- **Expected:** Scheduled game appears
- If game is today:
  - **Expected:** "You have a game scheduled today!" notification appears

---

### 5. Module Completion Test

**Test 5.1: Complete Training Module**
- Log in as Juan Reyes (progress at 75%)
- Navigate to Training Dashboard
- Complete one module
- **Expected:** progress_percent increases by module points (e.g., 75% → 85%)
- **Expected:** Dashboard reflects new progress

**Test 5.2: Rating Increase After 100%**
- Complete enough modules to exceed 100%
- **Expected:** displayed_rating increases by 0.5
- **Expected:** progress_percent resets
- **Expected:** Module completion logged in appropriate table

---

### 6. Self Assessment Update Test

**Test 6.1: Update Self Assessment**
- Log in as Carlos Mendoza
- Navigate to Self Assessment
- Update scores (increase all by 1 point)
- Submit
- **Expected:** progress_after_reassessment triggers
- **Expected:** progress_percent increases
- **Expected:** displayed_rating stays SAME (doesn't change on reassessment)

---

### 7. Status Expiration Test

**Test 7.1: Expired Status in Public Feed**
- Manually set Carlos's status_updated_at to 73 hours ago:
  ```sql
  UPDATE profiles
  SET status_updated_at = now() - interval '73 hours'
  WHERE username = 'carlos_mendoza';
  ```
- Log in as any user
- Navigate to Activity Feed
- **Expected:** Carlos does NOT appear

**Test 7.2: Expired Status Visible to Paddle Pals**
- Log in as Juan Reyes (connected to Carlos)
- Navigate to Paddle Pals list
- **Expected:** Carlos appears with expired status
- Navigate to Activity Feed
- **Expected:** Carlos does NOT appear (72-hour rule applies)

**Test 7.3: Cleanup Function**
- Run cleanup-statuses edge function
- **Expected:** Carlos's status set to "none"
- **Expected:** status_location and status_link cleared
- Check Activity Feed
- **Expected:** Carlos no longer appears anywhere

---

### 8. Dashboard Logic Test

**For Each User, Verify Dashboard Shows:**

**Maria Santos Dashboard:**
- ✅ Current rating: 3.5
- ✅ Badge: "Rising Star"
- ✅ Progress bar: 45%
- ✅ Current status: "Hosting open play"
- ✅ Status location: "Marikina Sports Center"
- ✅ Last status update: "1 hour ago"
- ✅ Training program overview
- ✅ Game logs (if any recorded)
- ✅ Scheduled games (if any created)
- ✅ "View Activity Feed" button
- ✅ Paddle Pals notification if activity in last 4 hours

**Juan Reyes Dashboard:**
- ✅ Current rating: 4.0
- ✅ Badge: "Ace Player"
- ✅ Progress bar: 75%
- ✅ Current status: "Looking for partner"
- ✅ All other dashboard elements

**Sofia Garcia Dashboard:**
- ✅ Current rating: 2.5
- ✅ Badge: "Beginner Pro"
- ✅ Progress bar: 20%
- ✅ Current status: "Looking for coach"
- ✅ All other dashboard elements
- ✅ Note: Profile is PRIVATE

**Carlos Mendoza Dashboard:**
- ✅ Current rating: 3.0
- ✅ Badge: "Court Master"
- ✅ Progress bar: 90%
- ✅ Current status: "Looking for court"
- ✅ All other dashboard elements

---

## Quick Test Checklist

- [ ] All four users can sign up and complete profiles
- [ ] Public profiles appear in Activity Feed
- [ ] Private profiles do NOT appear unless connected
- [ ] Event link button works for hosting status
- [ ] Activity Feed filters work correctly
- [ ] Paddle Pals appear first in feed
- [ ] Paddle Pals can see each other regardless of privacy
- [ ] Game recording updates progress correctly
- [ ] Progress bar displays accurate percentage
- [ ] Rating increases by 0.5 when crossing 100%
- [ ] Scheduled games appear on dashboard
- [ ] Invited players see scheduled games
- [ ] Module completion increases progress
- [ ] Self assessment updates progress but not rating
- [ ] Expired statuses (>72h) disappear from public feed
- [ ] Expired statuses still visible to Paddle Pals
- [ ] Cleanup function resets expired statuses
- [ ] Dashboard shows all correct information

---

## SQL Verification Queries

Use these queries to verify data in the database:

### Check All Profiles
```sql
SELECT username, display_name, is_profile_public, status, status_updated_at, displayed_rating, progress_percent
FROM profiles
WHERE username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
ORDER BY status_updated_at DESC;
```

### Check Paddle Pal Connections
```sql
SELECT
  sender.username AS sender,
  receiver.username AS receiver,
  pp.status,
  pp.created_at
FROM paddle_pals pp
JOIN profiles sender ON pp.sender_id = sender.id
JOIN profiles receiver ON pp.receiver_id = receiver.id
WHERE sender.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza')
   OR receiver.username IN ('maria_santos', 'juan_reyes', 'sofia_garcia', 'carlos_mendoza');
```

### Check Activity Feed Query (Maria's View)
```sql
-- Simulates what Maria would see
WITH maria AS (
  SELECT id FROM profiles WHERE username = 'maria_santos'
),
paddle_pals AS (
  SELECT pal_id
  FROM paddle_pals
  WHERE user_id = (SELECT id FROM maria)
    AND status = 'accepted'
)
SELECT
  p.username,
  p.display_name,
  p.status,
  p.status_location,
  p.status_updated_at,
  p.is_profile_public,
  CASE WHEN p.id IN (SELECT pal_id FROM paddle_pals) THEN 'Yes' ELSE 'No' END as is_paddle_pal
FROM profiles p
WHERE p.id != (SELECT id FROM maria)
  AND p.status != 'none'
  AND p.status IS NOT NULL
  AND p.status_updated_at >= now() - interval '72 hours'
  AND (p.is_profile_public = true OR p.id IN (SELECT pal_id FROM paddle_pals))
ORDER BY
  CASE WHEN p.id IN (SELECT pal_id FROM paddle_pals) THEN 0 ELSE 1 END,
  p.status_updated_at DESC;
```

### Check Games for User
```sql
SELECT
  pl.created_at,
  pl.result,
  lobby.match_format,
  lobby.location_name,
  lobby.status
FROM lobby_players pl
JOIN practice_lobbies lobby ON pl.lobby_id = lobby.id
WHERE pl.user_id = (SELECT id FROM profiles WHERE username = 'maria_santos')
ORDER BY pl.created_at DESC;
```

---

## Notes

- All passwords are `password123` for easy testing
- Complete self-assessments to generate ratings and badges
- Status updates expire after 72 hours automatically
- Progress increases through games, modules, and reassessments
- Rating increases by 0.5 each time progress crosses 100%
- Paddle Pals always see each other's status regardless of expiration
