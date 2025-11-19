# Supabase Database Setup

## Overview

This directory contains SQL scripts for one-time database setup. All user creation logic is handled in **Next.js code** (see `src/app/auth/callback/route.ts`), not database triggers.

## Problem Solved

Previously, the Stripe webhook was failing with error: `"User not found for customer: cus_XXX"`

This happened because users would authenticate but no `main_table` row existed.

## Solution

**Next.js handles user creation:**
- When a user confirms their email, they're redirected to `/auth/callback`
- The callback route creates a `main_table` row using `upsert()`
- The Stripe webhook also uses `upsert()` as a safety net

**No database triggers needed** - all logic is in your Next.js application code.

---

## Setup Instructions

### Step 1: Add Unique Constraint

This is **required** for the `upsert()` operations to work properly.

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Copy and paste the contents of `setup_unique_constraint.sql`
5. Click **Run**

**File:** `setup_unique_constraint.sql`

This adds a unique constraint on `main_table.user_id` to prevent duplicates.

---

### Step 2: Backfill Existing Users (Optional)

If you have existing users who are missing `main_table` rows, run this script.

1. In the Supabase SQL Editor
2. Copy and paste the contents of `backfill_existing_users.sql`
3. Click **Run**

**File:** `backfill_existing_users.sql`

This creates `main_table` rows for all users who have confirmed their email but don't have a record yet.

---

## How It Works

### New User Flow

1. **User signs up** → `supabase.auth.signUp()` on client-side
2. **Email sent** → User clicks confirmation link
3. **Redirected to** → `/auth/callback?code=XXX`
4. **Callback route** → Exchanges code for session
5. **Next.js creates row** → `supabaseAdmin.from('main_table').upsert()`
6. **User redirected** → To dashboard

### Stripe Subscription Flow

1. **User clicks** → "Get Started" button on pricing card
2. **API called** → `/api/stripe/create-checkout-session`
3. **Webhook fired** → `checkout.session.completed`
4. **Webhook upserts** → Creates row if doesn't exist (safety net)
5. **User data saved** → Stripe customer ID and subscription info

---

## Files Modified

### Next.js Code Changes

1. **`src/app/auth/callback/route.ts`** (lines 2, 6-9, 21-42)
   - Added Supabase admin client
   - Added `upsert()` logic after successful authentication
   - Logs success/errors but doesn't block user login

2. **`src/app/api/stripe/webhook/route.ts`** (lines 96-106)
   - Already uses `upsert()` instead of `update()`
   - Acts as safety net when users subscribe

### SQL Scripts (One-Time Setup)

1. **`supabase/setup_unique_constraint.sql`**
   - Adds unique constraint on `main_table.user_id`
   - Run once

2. **`supabase/backfill_existing_users.sql`**
   - Creates rows for existing users
   - Run once (optional)

---

## Testing

### Test New User Creation

1. Create a new test account:
   ```
   Email: test@example.com
   Password: TestPassword123!
   ```

2. Check your email and click confirmation link

3. You should be redirected to the dashboard

4. Verify in Supabase SQL Editor:
   ```sql
   SELECT * FROM main_table WHERE user_id = 'USER_ID_HERE';
   ```

5. Check your Next.js logs for:
   ```
   Auth Callback: Successfully ensured main_table row exists for user: [user-id]
   ```

### Test Stripe Subscription

1. Sign in with a test account
2. Click "Get Started" on Pro or Ultra plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check webhook logs - error should be gone
6. Verify subscription data saved in `main_table`

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause:** Row already exists for this user

**Solution:** This is expected! The `upsert()` with `ON CONFLICT` should handle this automatically. If you're seeing this error, it means the unique constraint exists but the `onConflict` parameter might be incorrect.

**Fix:** Verify the code uses:
```typescript
.upsert(
  { user_id: userId, created_at: ... },
  { onConflict: 'user_id' }
)
```

### Webhook Still Shows "User not found"

**Check 1:** Verify unique constraint exists:
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.main_table'::regclass
AND conname = 'main_table_user_id_key';
```

**Check 2:** Manually check if user has a main_table row:
```sql
SELECT u.id, u.email, m.user_id, m.stripe_customer_id
FROM auth.users u
LEFT JOIN main_table m ON u.id = m.user_id
WHERE u.email = 'test@example.com';
```

**Check 3:** Look at Next.js server logs for errors:
```
Auth Callback: Failed to create main_table row: [error details]
```

### Users Missing main_table Rows

Run the backfill script to create rows for existing users:
```sql
-- From backfill_existing_users.sql
INSERT INTO public.main_table (user_id, created_at)
SELECT id, created_at FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
```

---

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zuwtrnzhcwhcfyezbtaa.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for admin operations
```

The auth callback uses `SUPABASE_SERVICE_ROLE_KEY` to bypass Row Level Security policies when creating user records.

---

## Why This Approach?

**Advantages of Next.js over SQL Triggers:**
- ✅ All logic in one place (easier to debug)
- ✅ Better visibility with console logs
- ✅ Can add custom logic (e.g., send welcome emails)
- ✅ Easier to test locally
- ✅ Clear deployment path (just deploy Next.js app)
- ✅ No database migration dependencies

**Safety Nets:**
- Auth callback creates row on email confirmation
- Stripe webhook creates row on first subscription (backup)
- Upsert prevents duplicates
- Errors logged but don't block user flow

---

## Summary

- **No database triggers** - all user creation is in Next.js code
- **Auth callback** creates `main_table` rows when users confirm email
- **Webhook** uses upsert as safety net when users subscribe
- **One-time setup** required: unique constraint + optional backfill
- **Webhook error** will be resolved after setup
