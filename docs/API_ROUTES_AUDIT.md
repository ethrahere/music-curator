# API Routes Audit & Analysis

## Overview
This document provides a comprehensive analysis of all API routes in the Curio music curator app, identifying inconsistencies and providing recommendations for standardization.

---

## 📊 Database Schema Reference

### Tables
1. **users** - Farcaster user profiles
   - Primary key: `farcaster_fid` (number)
   - Unique: `username` (string)
   - Fields: `bio`, `curator_score`, `farcaster_pfp_url`, `notification_token`

2. **recommendations** - Music tracks shared by curators
   - Primary key: `id` (UUID string)
   - Foreign key: `curator_fid` → `users.farcaster_fid`
   - Fields: `music_url`, `song_title`, `artist`, `artwork_url`, `embed_url`, `platform`, `review`, `genre`, `moods`, `tip_count`, `total_tips_usd`

3. **tips** - Tip transactions
   - Foreign keys: `recommendation_id`, `tipper_fid`, `curator_fid`
   - Fields: `amount` (legacy), `amount_usd`, `transaction_hash`

4. **co_signs** - Track endorsements
   - Foreign keys: `recommendation_id`, `user_fid`

---

## 🛤️ API Routes Documentation

### **TRACK ROUTES** (`/api/tracks`)

#### `GET /api/tracks`
**Purpose:** List/search all tracks with filtering and sorting
**Query Params:**
- `sort` - "recent" | "most_tipped" (default: "recent")
- `limit` - Number of tracks (default: 20)
- `offset` - Pagination offset (default: 0)
- `genre` - Filter by genre (optional)

**Response:** `{ tracks: MusicTrack[] }`

**Supabase Query:**
```typescript
supabase
  .from('recommendations')
  .select('*, curator:users!curator_fid(farcaster_fid, username, curator_score)')
```

**Used By:**
- `app/page.tsx` - Main feed
- `app/feed/page.tsx` - Feed page

---

#### `POST /api/tracks`
**Purpose:** Create a new track recommendation
**Body:**
```typescript
{
  url: string;
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string;
  platform: string;
  review?: string;
  genre?: string;
  moods?: string[];
  sharedBy: {
    fid: number;
    username: string;
    pfpUrl?: string;
  }
}
```

**Logic:**
1. Upserts user into `users` table (by FID)
2. Inserts track into `recommendations` table
3. Returns saved track with DB-generated ID

**Response:** `{ success: boolean; track?: MusicTrack; error?: string }`

**Used By:** Track submission forms

---

#### `GET /api/tracks/[id]`
**Purpose:** Get a single track by ID
**Param:** `id` - Track UUID

**Response:** `{ track: MusicTrack }`

**Used By:**
- `app/play/page.tsx`
- Various components for track details

---

#### `POST /api/tracks/[id]` ⚠️ **LEGACY/DEPRECATED**
**Purpose:** Increment tip count (old endpoint)
**Body:** `{ action: "tip" }`

**⚠️ Issue:** This appears to be a legacy endpoint that only increments `tip_count` but doesn't record actual tip transactions. Should probably be removed or redirected to `/api/tracks/[id]/tip`.

**Used By:** Possibly legacy code - check if still in use

---

#### `POST /api/tracks/[id]/tip`
**Purpose:** Record a USDC tip transaction
**Body:**
```typescript
{
  txHash: string;        // Blockchain transaction hash
  fromFid: number;       // Tipper's FID
  toFid: number;         // Curator's FID
  requestedAmount: number; // USDC amount
  tipperUsername: string;
}
```

**Logic:**
1. Validates transaction hash format (0x...)
2. Validates amount (0-10000 USDC)
3. Looks up track with curator info
4. Upserts tipper into `users` table
5. Inserts tip into `tips` table
6. Updates `tip_count` and `total_tips_usd` on recommendation
7. Sends notification to curator (if token exists)

**Response:** `{ success: boolean; tipCount: number; totalTips: number }`

**Used By:**
- `components/Player.tsx`
- `components/TipButton.tsx`

---

#### `POST /api/tracks/[id]/cosign`
**Purpose:** Co-sign (endorse) a track
**Body:** `{ userFid: number }`

**Logic:**
1. Checks if track exists
2. Prevents self-cosigning
3. Checks for duplicate co-sign
4. Inserts co-sign record
5. Returns updated count

**Response:** `{ success: boolean; coSignCount: number }`

**Used By:** `components/Player.tsx`

---

#### `GET /api/tracks/[id]/cosign/check`
**Purpose:** Check if user has co-signed and get count
**Query Param:** `userFid` - User's FID (optional)

**Logic:**
- If no userFid: Returns just the count
- If userFid: Returns whether user has co-signed + count

**Response:**
```typescript
{
  success: boolean;
  hasCoSigned: boolean;
  coSignCount: number;
}
```

**Used By:** `components/Player.tsx`

---

### **USER ROUTES** (`/api/users`)

#### `GET /api/users/[username]/stats`
**Purpose:** Get user statistics
**Param:** `username` - Farcaster username (string)

**Logic:**
1. Looks up user by username
2. Calculates:
   - `tracksShared` - Count of recommendations
   - `tipsEarned` - Sum of `total_tips_usd`
   - `successRate` - % of tracks with 5+ USDC tips
   - `followers` - Placeholder (0)

**Response:**
```typescript
{
  success: boolean;
  fid: number;
  stats: {
    tracksShared: number;
    followers: number;
    tipsEarned: number;
    successRate: number;
  };
  bio: string;
}
```

**Used By:**
- `app/profile/page.tsx`
- `app/curator/[username]/page.tsx`

---

#### `GET /api/users/[username]/tracks`
**Purpose:** Get all tracks shared by a user
**Param:** `username` - Farcaster username (string)

**Logic:**
1. Looks up user by username to get FID
2. Queries recommendations by `curator_fid`
3. Orders by `created_at` descending

**Response:** `{ success: boolean; tracks: MusicTrack[] }`

**Used By:**
- `app/profile/page.tsx`
- `app/curator/[username]/page.tsx`

---

#### `POST /api/users/[username]/bio`
**Purpose:** Update user bio
**Param:** `username` - Farcaster username (string)
**Body:** `{ bio: string }`

**Logic:**
- Updates `bio` field for user with matching username

**Response:** `{ success: boolean }`

**Used By:** `app/profile/page.tsx`

---

#### `GET /api/users/[username]/address` ✅ **NEW - UNIFIED**
**Purpose:** Get wallet address for a user
**Param:** `username` - Can be EITHER:
  - FID (number as string, e.g., "12345")
  - Username (string, e.g., "alice")

**Logic:**
1. Detects if parameter is numeric (FID) or string (username)
2. If username: Looks up FID in database
3. Fetches verified addresses from Farcaster Hub API
4. Returns primary address (first in list)

**Response:**
```typescript
{
  success: boolean;
  fid: number;
  primaryAddress: string | null;
  allAddresses: string[];
}
```

**Used By:** `components/Player.tsx` (calls with FID)

---

#### `GET /api/users/pfps`
**Purpose:** Get profile pictures for multiple users
**Used By:** Bulk operations (check implementation)

---

#### `POST /api/users/backfill-pfp`
**Purpose:** Backfill missing profile pictures
**Used By:** Admin/maintenance operations

---

### **OTHER ROUTES**

#### `GET /api/frame/[id]/og` (TSX)
**Purpose:** Generate Open Graph image for track embeds
**Used By:** Social media embeds

#### `GET /api/og-image` (TSX)
**Purpose:** Generate generic OG image
**Used By:** Default social media embeds

#### `GET /api/profile-card` (TSX)
**Purpose:** Generate profile card image
**Used By:** User profile embeds

#### `GET /api/debug-meta/[id]`
**Purpose:** Debug metadata for tracks
**Used By:** Development/debugging

---

## 🔍 IDENTIFIED ISSUES & INCONSISTENCIES

### 1. **Supabase Client Instantiation** ⚠️ CRITICAL

**Problem:** THREE different patterns for creating Supabase clients:

**Pattern A: Using exported singleton** (`lib/supabase.ts`)
```typescript
import { supabase } from '@/lib/supabase';
```
Used in:
- `/api/tracks/route.ts` ✅
- `/api/tracks/[id]/route.ts` ✅

**Pattern B: Creating new client with SERVICE_ROLE_KEY**
```typescript
const getSupabase = () => {
  return createClient(url, SUPABASE_SERVICE_ROLE_KEY);
};
```
Used in:
- `/api/tracks/[id]/tip/route.ts` ⚠️
- `/api/tracks/[id]/cosign/route.ts` ⚠️
- `/api/users/[username]/stats/route.ts` ⚠️
- `/api/users/[username]/bio/route.ts` ⚠️
- `/api/users/[username]/tracks/route.ts` ⚠️

**Pattern C: Creating new client with ANON_KEY**
```typescript
const getSupabase = () => {
  return createClient(url, NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
```
Used in:
- `/api/tracks/[id]/cosign/check/route.ts` ⚠️

**Recommendation:**
- **Standardize on Pattern A** (singleton from `lib/supabase.ts`)
- The singleton should use SERVICE_ROLE_KEY for API routes
- Remove all `getSupabase()` functions
- Only use ANON_KEY for client-side operations (not in API routes)

---

### 2. **FID vs Username Parameter Inconsistency** ⚠️ MEDIUM

**Problem:** Routes use different identifiers inconsistently:

**Routes Using Username:**
- `GET /api/users/[username]/stats` - ✅ Correct (user-facing)
- `GET /api/users/[username]/tracks` - ✅ Correct (user-facing)
- `GET /api/users/[username]/bio` - ✅ Correct (user-facing)
- `POST /api/users/[username]/bio` - ✅ Correct (user-facing)

**Routes Using FID:**
- `GET /api/users/[username]/address` - ⚠️ Mixed (accepts both FID and username)

**Client-Side Calls:**
- Most pages use username (correct for URLs)
- Player component uses FID (necessary for blockchain address lookup)

**Current Solution:** The `/address` route now accepts both, which is good!

**Recommendation:**
- ✅ Keep current implementation - it's flexible
- Document that `[username]` parameter accepts both FID (as numeric string) and username
- Consider renaming parameter to `[identifier]` for clarity (optional)

---

### 3. **Duplicate/Legacy Endpoint** ⚠️ MEDIUM

**Problem:** Two endpoints for tipping:
- `POST /api/tracks/[id]` with `{ action: "tip" }` - Legacy, only increments counter
- `POST /api/tracks/[id]/tip` - Current, records full transaction

**Recommendation:**
- ✅ Remove or deprecate `POST /api/tracks/[id]` with action pattern
- All tipping should go through `/api/tracks/[id]/tip`
- Check if any client code still uses the legacy endpoint

---

### 4. **Error Handling Inconsistency** ⚠️ LOW

**Problem:** Different error response formats:

**Format A:**
```typescript
return NextResponse.json({ error: 'Message' }, { status: 404 });
```

**Format B:**
```typescript
return NextResponse.json({ success: false, error: 'Message' }, { status: 404 });
```

**Recommendation:**
- Standardize on Format B (with `success` field)
- Always include `success: boolean` in responses
- Consider adding error codes for client-side handling

---

### 5. **Response Format Inconsistency** ⚠️ LOW

**Problem:** Some routes return data directly, others wrap in object:

**Format A:** `{ tracks: [...] }`
**Format B:** `{ success: true, tracks: [...] }`

**Recommendation:**
- Standardize on Format B
- Always include `success: boolean`
- Makes error handling more consistent on client side

---

### 6. **No Request Authentication** ⚠️ SECURITY CONCERN

**Problem:** API routes don't verify request authenticity

**Current State:**
- Routes accept FID in request body
- No verification that request is from that FID
- Anyone can submit tips/co-signs as any user

**Recommendation:**
- Implement Farcaster Frame authentication
- Verify signatures on all mutating operations
- For now: Add rate limiting and validation

---

### 7. **Data Transformation Duplication** ⚠️ LOW

**Problem:** Same DB→MusicTrack transformation code repeated in multiple files

**Locations:**
- `/api/tracks/route.ts` (lines 38-54)
- `/api/tracks/[id]/route.ts` (lines 25-40)
- `/api/tracks/[id]/route.ts` (lines 82-97) - duplicate within same file!
- `/api/users/[username]/tracks/route.ts` (lines 57-71)

**Recommendation:**
- Create shared utility function: `lib/transformers/track.ts`
```typescript
export function transformDbRecordToTrack(rec: any): MusicTrack {
  return {
    id: rec.id,
    url: rec.music_url,
    platform: rec.platform || 'other',
    title: rec.song_title,
    artist: rec.artist,
    artwork: rec.artwork_url || DEFAULT_ARTWORK_URL,
    embedUrl: rec.embed_url || '',
    tips: rec.total_tips_usd || 0,
    sharedBy: {
      fid: rec.curator?.farcaster_fid || 0,
      username: rec.curator?.username || 'unknown',
      curatorScore: rec.curator?.curator_score || 0,
    },
    timestamp: new Date(rec.created_at).getTime(),
    review: rec.review || undefined,
  };
}
```

---

## ✅ RECOMMENDED ACTION ITEMS

### Priority 1: Critical
1. **Standardize Supabase client creation** - Use singleton from `lib/supabase.ts` everywhere
2. **Remove duplicate tipping endpoint** - Deprecate `POST /api/tracks/[id]` action pattern
3. **Add request authentication** - At minimum, add validation

### Priority 2: High
4. **Create data transformation utilities** - Reduce code duplication
5. **Standardize error responses** - Always include `success` field

### Priority 3: Medium
6. **Document the [username] parameter flexibility** - Make it clear it accepts both FID and username
7. **Add API route tests** - Prevent regressions

### Priority 4: Nice to Have
8. **Add TypeScript types for API responses** - Create shared response types
9. **Consider API versioning** - Plan for future changes (e.g., `/api/v1/...`)
10. **Add request/response logging** - Better debugging

---

## 📋 CLIENT-SIDE USAGE SUMMARY

### By Page:
- **app/page.tsx** - GET /api/tracks (with sorting/filtering)
- **app/feed/page.tsx** - GET /api/tracks
- **app/play/page.tsx** - GET /api/tracks/[id]
- **app/profile/page.tsx** - GET /api/users/[username]/{stats,tracks}, POST /api/users/[username]/bio
- **app/curator/[username]/page.tsx** - GET /api/users/[username]/{stats,tracks}

### By Component:
- **components/Player.tsx**:
  - GET /api/users/[fid]/address
  - GET /api/tracks/[id]/cosign/check
  - POST /api/tracks/[id]/cosign
  - POST /api/tracks/[id]/tip

- **components/TipButton.tsx**:
  - POST /api/tracks/[id]/tip

---

## 🎯 NEXT STEPS

1. Review this document
2. Prioritize which issues to fix first
3. Create GitHub issues for each action item
4. Implement fixes incrementally
5. Add tests to prevent regressions
6. Update API documentation

---

**Generated:** 2025-10-16
**Last Updated:** 2025-10-16
