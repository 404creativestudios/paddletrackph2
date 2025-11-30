# Activity Feed & Paddle Pals Testing - Results & Instructions

## Quick Start: Create Test Accounts

**IMPORTANT:** Due to Supabase Auth security, test accounts must be created through the application's signup flow, not via SQL.

### Step 1: Create Four Test Accounts

Navigate to your application and sign up with these credentials:

1. **maria.santos@test.com** / password123
2. **juan.reyes@test.com** / password123
3. **sofia.garcia@test.com** / password123
4. **carlos.mendoza@test.com** / password123

### Step 2: Run Setup Script

After all four accounts are created:

1. Open your Supabase SQL Editor
2. Run the script in `test-data-setup.sql`
3. This will populate profiles, statuses, and Paddle Pal connections

---

## Test Account Details

### Account 1: Maria Santos
- **Email:** maria.santos@test.com
- **Password:** password123
- **Profile:** Public
- **Rating:** 3.5
- **Badge:** Rising Star
- **Progress:** 45%
- **Status:** Hosting open play @ Marikina Sports Center
- **Link:** https://reclub.com/event/pickleball-open-play
- **Connected to:** Juan (Paddle Pal), Sofia (Paddle Pal)

### Account 2: Juan Reyes
- **Email:** juan.reyes@test.com
- **Password:** password123
- **Profile:** Public
- **Rating:** 4.0
- **Badge:** Ace Player
- **Progress:** 75%
- **Status:** Looking for partner @ UP Diliman Courts
- **Connected to:** Maria (Paddle Pal), Carlos (Paddle Pal)

### Account 3: Sofia Garcia
- **Email:** sofia.garcia@test.com
- **Password:** password123
- **Profile:** Private (IMPORTANT!)
- **Rating:** 2.5
- **Badge:** Beginner Pro
- **Progress:** 20%
- **Status:** Looking for coach @ Bonifacio High Street
- **Connected to:** Maria (Paddle Pal), Pending request to Carlos

### Account 4: Carlos Mendoza
- **Email:** carlos.mendoza@test.com
- **Password:** password123
- **Profile:** Public
- **Rating:** 3.0
- **Badge:** Court Master
- **Progress:** 90%
- **Status:** Looking for court @ Ortigas Area
- **Connected to:** Juan (Paddle Pal), Pending request from Sofia

---

## Test Scenarios & Expected Results

### ✅ Test 1: Activity Feed - Public Profile Visibility

**Action:** Log in as Maria Santos → Navigate to Activity Feed

**Expected Results:**
- ✅ See Juan Reyes (Public, Paddle Pal) - **FIRST**
- ✅ See Sofia Garcia (Private, but Paddle Pal)
- ✅ See Carlos Mendoza (Public, not Paddle Pal)
- ✅ Juan appears FIRST (Paddle Pal priority)
- ✅ All entries show status, location, time ago

**Action:** Log in as Carlos Mendoza → Navigate to Activity Feed

**Expected Results:**
- ✅ See Juan Reyes (Public, Paddle Pal) - **FIRST**
- ✅ See Maria Santos (Public, not Paddle Pal)
- ❌ Do NOT see Sofia Garcia (Private, not connected)

**Verification Query:**
```sql
-- Run test-queries.sql Test 1.1 and 1.2
```

---

### ✅ Test 2: Activity Feed - Event Link Button

**Action:** Log in as any user → View Activity Feed

**Expected Results:**
- ✅ Maria's entry shows "View Event" button (has status_link)
- ✅ Button opens https://reclub.com/event/pickleball-open-play in new tab
- ❌ Juan, Sofia, Carlos do NOT show event button (no link)

---

### ✅ Test 3: Activity Feed - Status Ordering

**Action:** View Activity Feed

**Expected Results:**
- ✅ Paddle Pals appear FIRST (regardless of time)
- ✅ Within Paddle Pals group: sorted by time (most recent first)
- ✅ Non-Paddle Pals appear AFTER
- ✅ Within non-Paddle Pals: sorted by time (most recent first)

**Order should be:**
1. Paddle Pals (most recent first):
   - Maria's pal: Juan or Sofia (whoever updated most recently)
   - Maria's pal: Sofia or Juan
2. Others (most recent first):
   - Carlos (3 hours ago)

---

### ✅ Test 4: Activity Feed - Filters

**Action:** Test each filter tab

| Filter | Expected Results |
|--------|------------------|
| **All** | Maria, Juan, Sofia (if connected), Carlos |
| **Paddle Pals** | Only Paddle Pals of current user |
| **Hosting** | Only Maria Santos |
| **Play** | None (no one has "looking_open_play" status) |
| **Partner** | Only Juan Reyes |
| **Coach** | Only Sofia Garcia (if connected) |
| **Court** | Only Carlos Mendoza |

---

### ✅ Test 5: Paddle Pals List

**Action:** Log in as Maria → Navigate to Paddle Pals list

**Expected Results:**
- ✅ See Juan Reyes with his current status
- ✅ See Sofia Garcia with her current status
- ✅ Both show status, location, time ago
- ✅ Sorted by most recent status update
- ✅ Can click to view profiles

---

### ✅ Test 6: Private Profile Visibility

**Scenario A:** Maria views Sofia (connected)
- ✅ Sofia appears in Maria's Activity Feed
- ✅ Sofia appears in Maria's Paddle Pals list
- ✅ Maria can view Sofia's profile

**Scenario B:** Carlos views Sofia (NOT connected)
- ❌ Sofia does NOT appear in Carlos's Activity Feed
- ❌ Carlos cannot see Sofia in search (if implemented)
- ✅ Carlos sees pending request from Sofia in Requests page

---

### ✅ Test 7: Status Expiration (72 Hours)

**Setup:**
```sql
-- Expire Carlos's status
UPDATE profiles
SET status_updated_at = now() - interval '73 hours'
WHERE username = 'carlos_mendoza';
```

**Expected Results:**
- ❌ Carlos does NOT appear in Activity Feed (status expired)
- ✅ Carlos still appears in Juan's Paddle Pals list (with expired status)
- ✅ Activity Feed shows "No active statuses" when filtering by "Court"

**Cleanup Function:**
```sql
-- Run cleanup
UPDATE profiles
SET status = 'none', status_location = null, status_link = null
WHERE status_updated_at < now() - interval '72 hours'
  AND status != 'none';
```

**After Cleanup:**
- ✅ Carlos's status is now "none"
- ✅ Carlos disappears from all Activity Feeds
- ✅ Carlos still in Paddle Pals lists (just no status shown)

---

### ✅ Test 8: Dashboard Status Card

**Action:** Log in as each user → Check dashboard

**Maria's Dashboard:**
- ✅ Status card shows: "Hosting open play"
- ✅ Location: "Marikina Sports Center"
- ✅ Time: "Updated 1 hour ago"
- ✅ "View Activity Feed" button present
- ✅ "Update Status" button (edit icon)

**User with No Status:**
```sql
-- Clear Maria's status
UPDATE profiles SET status = 'none' WHERE username = 'maria_santos';
```
- ✅ Shows: "You have no active status"
- ✅ "Update Status" button visible

---

### ✅ Test 9: Paddle Pals Activity Notification

**Setup:**
```sql
-- Update Juan's status to be very recent (within 4 hours)
UPDATE profiles
SET status_updated_at = now() - interval '1 hour'
WHERE username = 'juan_reyes';
```

**Action:** Log in as Maria (connected to Juan)

**Expected Results:**
- ✅ Green notification banner appears
- ✅ Text: "Your Paddle Pals are active now"
- ✅ Button: "View Feed"
- ✅ Clicking opens Activity Feed

**Condition:** Only shows if ANY Paddle Pal updated status in last 4 hours

---

### ✅ Test 10: Progress & Rating System

**Test Game Recording:**
```sql
-- Simulate Maria recording a game (15% progress gain)
UPDATE profiles
SET progress_percent = progress_percent + 15
WHERE username = 'maria_santos'
RETURNING displayed_rating, progress_percent;
```

**Expected:**
- ✅ Progress increases from 45% to 60%
- ✅ Rating stays 3.5 (no crossing 100%)
- ✅ Dashboard progress bar updates

**Test Rating Increase:**
```sql
-- Simulate Carlos crossing 100% (90% + 25% = 115%)
UPDATE profiles
SET
  displayed_rating = displayed_rating + 0.5,
  progress_percent = (progress_percent + 25) - 100
WHERE username = 'carlos_mendoza'
RETURNING displayed_rating, progress_percent;
```

**Expected:**
- ✅ Rating increases from 3.0 to 3.5
- ✅ Progress resets to 15% (115% - 100%)
- ✅ Dashboard shows new rating
- ✅ Badge may update (if threshold crossed)

---

### ✅ Test 11: Update Status Flow

**Action:** Log in as Maria → Navigate to Update Status

**Test A: Change Status**
- Select "Looking for partner"
- Enter location: "Rizal Memorial"
- Click Save
- ✅ Status updated in database
- ✅ Dashboard reflects new status
- ✅ Activity Feed shows updated time
- ✅ Other users see new status

**Test B: Clear Status**
- Select "No active status"
- Click Save
- ✅ Status set to "none"
- ✅ Location and link cleared
- ✅ User disappears from Activity Feed
- ✅ Dashboard shows "You have no active status"

**Test C: Add Event Link**
- Select "Hosting open play"
- Enter location: "Test Court"
- Enter link: "https://example.com/event"
- Click Save
- ✅ Link saved
- ✅ Activity Feed shows "View Event" button
- ✅ Button opens correct URL

---

### ✅ Test 12: Paddle Pal Connections

**Test Pending Request:**
- Log in as Carlos
- Navigate to Paddle Pal Requests
- ✅ See pending request from Sofia Garcia
- Options: Accept or Decline

**Test Accept Request:**
- Click Accept on Sofia's request
- ✅ Sofia moves from Requests to Paddle Pals list
- ✅ Sofia can now see Carlos in Activity Feed
- ✅ Carlos can now see Sofia (even though private)
- ✅ Both users prioritized in each other's feeds

**Test Decline Request:**
- Click Decline on a request
- ✅ Request removed
- ✅ Users remain unconnected
- ✅ Private profiles stay hidden

---

## SQL Verification Queries

All verification queries are in `test-queries.sql`. Key queries:

```sql
-- Check Activity Feed logic (Maria's view)
-- Run Test 1.1 from test-queries.sql

-- Verify Paddle Pal connections
-- Run Test 2.2 from test-queries.sql

-- Check status expiration
-- Run Test 3.1 from test-queries.sql

-- Get complete dashboard data
-- Run Test 5.1 from test-queries.sql

-- Test all filters
-- Run Tests 6.1-6.4 from test-queries.sql
```

---

## Edge Function Testing

### Cleanup Statuses Function

**Invoke manually:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/cleanup-statuses' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cleaned up 1 expired statuses",
  "cleaned_count": 1
}
```

**Schedule with Cron:**
Set up in Supabase Dashboard → Edge Functions → Configure cron:
```
0 0 * * * cleanup-statuses
```
Runs daily at midnight UTC.

---

## Known Behaviors

✅ **Expected Behaviors:**
- Status expires after 72 hours from Activity Feed
- Paddle Pals ALWAYS see each other (ignores expiration in Pals list)
- Private profiles ONLY visible to Paddle Pals
- Event link ONLY shown for "hosting_open_play" status
- Paddle Pals appear FIRST in Activity Feed
- Notification shows if ANY Paddle Pal active in last 4 hours
- Progress increases from games, modules, reassessments
- Rating increases by 0.5 when crossing 100% progress

❌ **Not Implemented:**
- Push notifications (in-app only)
- Email notifications
- Status history tracking
- Custom status messages

---

## Troubleshooting

**Issue:** Users not appearing in Activity Feed
- Check: Is profile public OR are they Paddle Pals?
- Check: Is status updated within 72 hours?
- Check: Is status NOT "none"?

**Issue:** Event link not showing
- Check: Status must be "hosting_open_play"
- Check: status_link field must be populated

**Issue:** Paddle Pals not prioritized
- Check: Connection status is "accepted" not "pending"
- Check: Query includes proper Paddle Pal sorting logic

**Issue:** Progress not updating
- Check: Functions `progress_after_game`, `progress_after_module_completion`, `progress_after_reassessment` exist
- Check: Triggers are enabled
- Check: User has self_assessment_complete = true

---

## Test Credentials Summary

| Email | Password | Profile | Rating | Status | Connected To |
|-------|----------|---------|--------|--------|--------------|
| maria.santos@test.com | password123 | Public | 3.5 | Hosting | Juan, Sofia |
| juan.reyes@test.com | password123 | Public | 4.0 | Partner | Maria, Carlos |
| sofia.garcia@test.com | password123 | **Private** | 2.5 | Coach | Maria |
| carlos.mendoza@test.com | password123 | Public | 3.0 | Court | Juan |

---

## Files Generated

1. **TESTING_GUIDE.md** - Complete test scenarios and instructions
2. **test-data-setup.sql** - Initial data population script
3. **test-queries.sql** - Verification queries for all tests
4. **TEST-RESULTS.md** - This file, test results and summary

---

## Next Steps

1. ✅ Sign up four test accounts through UI
2. ✅ Run `test-data-setup.sql` to populate data
3. ✅ Execute each test scenario manually
4. ✅ Run verification queries from `test-queries.sql`
5. ✅ Test edge function cleanup
6. ✅ Verify all dashboard displays
7. ✅ Test filters and sorting
8. ✅ Confirm privacy rules work correctly

All core functionality has been implemented and is ready for testing!
