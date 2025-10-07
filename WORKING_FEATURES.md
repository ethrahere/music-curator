# Curio - Working Features Documentation

**Last Updated:** 2025-01-07
**Purpose:** Reference document for all working features and their configurations

---

## 🎵 Music Sharing & Discovery

### Track Submission Flow
**Status:** ✅ Working

1. User clicks "+" button in top-right corner
2. ShareMusicModal opens with URL input
3. Supports: YouTube, Spotify, SoundCloud, Bandcamp, Apple Music
4. Extracts metadata via oEmbed APIs
5. Optional fields:
   - Review (500 char max) - **saves to DB** as `review` field
   - Genre dropdown - **saves to DB** as `genre` field
   - Moods (multi-select) - **saves to DB** as `moods` array
6. On submit:
   - Creates track in Supabase `recommendations` table
   - Shares to Farcaster with format:
     - If review provided: `{review}\n\n🎵 {title} - {artist}`
     - If no review: `🎵 {title} - {artist}`
   - Track embed includes album artwork

**Files:**
- `components/ShareMusicModal.tsx` (lines 68-73: submission with review/genre/moods)
- `app/page.tsx` (lines 138-151: cast text formatting)
- `app/api/tracks/route.ts` (lines 91-98: DB insert with review/genre/moods)

---

## 🎮 Farcaster Mini App Integration

### Track Embed with Play Button
**Status:** ✅ Working

When a track is shared on Farcaster, it displays as a rich embed with:
- Album artwork (3:2 aspect ratio)
- Track title and artist
- Platform badge (YouTube, Spotify, etc.)
- **"▶ Play" button** that launches the mini app

**Configuration (DO NOT CHANGE):**
```typescript
// app/track/[id]/page.tsx (lines 36-50)
const miniAppMetadata = {
  version: '1',
  imageUrl: artwork3x2, // 3:2 aspect ratio OG image
  button: {
    title: '▶ Play',
    action: {
      type: 'launch_frame',  // ⚠️ CRITICAL: Must be 'launch_frame' not 'launch'
      name: 'Music Player',
      url: `${baseUrl}/play?trackId=${data.id}`,
      splashImageUrl: `${baseUrl}/curio.png`,
      splashBackgroundColor: '#1a1a1a',
    },
  },
};

// Meta tags (lines 74-77)
other: {
  'fc:miniapp': JSON.stringify(miniAppMetadata),
  'fc:frame': JSON.stringify(miniAppMetadata), // Backward compatibility
}
```

**OG Image Generation:**
- Route: `app/api/og-image/route.tsx`
- Format: Split layout (artwork left, info card right)
- Size: 1200x800 (3:2 aspect ratio)
- Includes platform badge and Curatoor branding

---

## 💰 Tipping System

### Tip Flow
**Status:** ✅ Working (with proper validation)

1. User clicks "Tip" button in player
2. Selects amount ($1, $5, $10) or custom amount
3. Farcaster SDK opens with pre-filled recipient FID and USDC token
4. User completes transaction in wallet
5. **Only if transaction succeeds** (SDK returns `success: true`):
   - Record inserted into `tips` table with transaction hash
   - `tip_count` incremented on `recommendations`
   - `total_tips_usd` updated on `recommendations`
   - Success animation shown (3 seconds)
   - "📢 Share tip on Farcaster" button appears
6. If user cancelled or failed: silently reset (no error shown)

**Direct SDK Implementation (CRITICAL - DO NOT CHANGE):**
```typescript
// components/Player.tsx (lines 77-81)
const result = await sdk.actions.sendToken({
  token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: (amount * 1000000).toString(),
  recipientFid: curatorFid,
});

// Validation (lines 86-91)
if (!result.success) {
  console.log('Tip cancelled or failed:', result.reason);
  setTipping(false);
  return; // Do NOT record in database
}
```

**API Request Format:**
```typescript
// components/Player.tsx (lines 97-104)
{
  txHash: result.send.transaction,
  fromFid: tipper.fid,
  toFid: curatorFid,
  requestedAmount: amount,
  timestamp: Date.now(),
  tipperUsername: tipper.username,
}
```

**Database Updates:**
- Table: `tips` (tracks individual tips)
  - `recommendation_id`: Track UUID
  - `tipper_address`: Format `fid:{fid}`
  - `curator_address`: Curator's address
  - `amount_usd`: Tip amount in USDC
  - `transaction_hash`: Blockchain transaction hash
- Table: `recommendations` (aggregates)
  - `tip_count`: Total number of tips
  - `total_tips_usd`: Total USD value of tips

**Share Tip Feature:**
- Cast format: `Just tipped ${amount} USDC to @{username} for sharing "{title}" by {artist}! 💰🎵`
- Includes track URL as embed
- Button visible for 3 seconds after successful tip

**Files:**
- `components/Player.tsx` (lines 69-135: handleTip function with direct SDK call)
- `app/api/tracks/[id]/tip/route.ts` (tip recording with new request format)
- Note: No longer uses wrapper function - calls `sdk.actions.sendToken` directly

---

## 🔍 Feed & Filtering

### Home Page Feed
**Status:** ✅ Working

- **Sort Order:** Latest shared first (`sort=recent`)
- **Infinite Scroll:** Loads 12 tracks per page
- **Filter Pills:**
  - "Community Curated" (all tracks)
  - "Electronic" (genre filter)

**API Query:**
```typescript
// app/page.tsx (line 34)
const response = await fetch(
  `/api/tracks?sort=recent&limit=${LIMIT}&offset=${offset}${genreParam}`
);
```

**Genre Filtering:**
```typescript
// app/api/tracks/route.ts (lines 17-20)
if (genre) {
  query = query.eq('genre', genre);
}
```

---

## 👤 Profile System

### User Profile Page
**Status:** ✅ Working

**Features:**
- Farcaster PFP display
- Editable bio (200 char max, saves to `users.bio`)
- Stats grid:
  - Tracks Shared (from `recommendations` count)
  - Followers (placeholder: 0)
  - Tips Earned (sum of `total_tips_usd`)
  - Success Rate (% of tracks with 5+ USDC tips)
- Badges (static for now)
- Playlist: Expandable "All Tracks" folder

**Share Profile Card:**
- Button: "Share Profile"
- Generates OG image at `/api/profile-card`
- Cast format: `Check out my curator profile on Curio! 🎵\n\n{stats.tracksShared} tracks shared • ${stats.tipsEarned} earned • {stats.successRate}% success rate`

**User Lookup (handles username vs address):**
```typescript
// app/api/users/[username]/stats/route.ts (lines 24-39)
let { data: user } = await supabase
  .from('users')
  .select('address, bio')
  .eq('username', username)
  .single();

// Fallback to address if username not found
if (!user) {
  const { data: userByAddress } = await supabase
    .from('users')
    .select('address, bio')
    .eq('address', username)
    .single();
  user = userByAddress;
}
```

---

## 🎼 Player & Navigation

### Music Player
**Status:** ✅ Working

**Features:**
- Full-screen player with gradient background
- Platform-specific iframe embeds:
  - Spotify: 352px height
  - SoundCloud: 166px height
  - YouTube: 315px height
- Actions:
  - Tip button (shows total tips: `${track.tips}`)
  - Share button
  - "Open in Platform" (for Spotify/Apple Music)
- Previous/Next track navigation buttons (chevron icons)
- "Up Next" indicator (shows next track in playlist)

**Playlist Context:**
- Home feed: Navigate through all tracks (or filtered by genre)
- Profile page: Navigate through user's tracks
- Playlist passed via props with current index

**Layout Fix:**
```typescript
// components/Player.tsx (line 163)
// Changed from justify-center to justify-start with pt-8
// Prevents title from hiding behind top bar
<div className="flex-1 flex flex-col items-center justify-start px-6 pb-8 pt-8 overflow-auto">
```

---

## 🎨 UI/UX Design System (Curatoor)

### Color Tokens
```css
--bg-forest-start: #07110b
--bg-forest-end: #0b1a12
--panel-gradient: linear-gradient(135deg, #e8f5ed 0%, #d4ebe0 100%)
--button-gradient: linear-gradient(135deg, #a8e6c5 0%, #7fd4a8 100%)
--text-primary: #0b1a12
--text-secondary: #2d4a3a
```

### Typography
- Primary font: DM Sans (400, 500, 600, 700)
- Loaded via Next.js `next/font/google`

### Component Classes
- `.panel-surface`: Pastel mint gradient panels with border
- `.pill-tag`: Rounded full badges
- `.input-shell`: Form inputs with panel styling
- `.btn-pastel`: Gradient buttons

---

## 📊 Database Schema

### Tables

**users**
- `address` (TEXT, UNIQUE): Primary identifier
- `username` (TEXT): Farcaster username
- `farcaster_fid` (INTEGER): Farcaster ID
- `bio` (TEXT): User bio (max 200 chars)
- `notification_token` (TEXT): For push notifications

**recommendations**
- `id` (UUID): Auto-generated
- `curator_address` (TEXT): References `users.address`
- `music_url` (TEXT): Original track URL
- `song_title` (TEXT): Track title
- `artist` (TEXT): Artist name
- `review` (TEXT): User's review/comment
- `genre` (TEXT): Genre (lowercase)
- `moods` (TEXT[]): Array of mood tags
- `platform` (TEXT): Platform name
- `artwork_url` (TEXT): Album artwork URL
- `embed_url` (TEXT): Embeddable player URL
- `tip_count` (INTEGER): Number of tips received
- `total_tips_usd` (DECIMAL): Total USDC tips

**tips**
- `id` (UUID): Auto-generated
- `recommendation_id` (UUID): References `recommendations.id`
- `tipper_address` (TEXT): References `users.address`
- `curator_address` (TEXT): References `users.address`
- `amount` (INTEGER): Legacy field (0)
- `amount_usd` (DECIMAL): USDC amount
- `transaction_hash` (TEXT): Blockchain tx hash

### Foreign Key Relationships
```sql
-- In Supabase queries, use this syntax:
.select('*, users!recommendations_curator_address_fkey(farcaster_fid, username)')

-- This joins recommendations.curator_address -> users.address
```

---

## 🖼️ Image Configuration

### Next.js Allowed Domains
```typescript
// next.config.ts (lines 4-45)
remotePatterns: [
  { hostname: '**.ytimg.com' },           // YouTube thumbnails
  { hostname: '**.scdn.co' },             // Spotify images
  { hostname: '**.spotifycdn.com' },      // Spotify CDN
  { hostname: '**.soundcloud.com' },      // SoundCloud
  { hostname: '**.bcbits.com' },          // Bandcamp
  { hostname: 'placehold.co' },           // Placeholder
  { hostname: 'i.imgur.com' },            // Farcaster PFPs
  { hostname: '**.warpcast.com' },        // Farcaster PFPs
  { hostname: 'imagedelivery.net' },      // Farcaster CDN
]
```

---

## 🚨 Known Issues & Workarounds

### Build Warnings (Non-Breaking)
- `<img>` in OG image routes: Expected, can't use Next.js Image in edge runtime
- React hooks exhaustive-deps: Intentional, empty array prevents re-creating fetchTracks
- Farcaster SDK deprecation: Non-critical, migration to miniapp-sdk planned

### ESLint Suppressions
```typescript
// app/page.tsx (line 51)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

## 🔧 Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_BASE_URL=https://music-curator.vercel.app
FARCASTER_NOTIFICATION_URL=https://api.farcaster.xyz/v1/notifications (optional)
```

---

## 📝 Testing Checklist

Before deploying changes, verify:

- [ ] Build succeeds: `npm run build`
- [ ] Track sharing works with review/genre/moods
- [ ] Farcaster embed shows "▶ Play" button
- [ ] Tipping only records on successful transaction
- [ ] Profile stats show correct numbers
- [ ] Genre filtering works (Electronic pill)
- [ ] Player navigation (prev/next) works
- [ ] Share tip feature appears after successful tip
- [ ] Images load (check allowed domains)

---

## 🎯 Critical Configuration Points

**DO NOT CHANGE:**
1. `type: 'launch_frame'` in track embed metadata
2. Supabase foreign key join syntax: `users!recommendations_curator_address_fkey`
3. Tip validation: Must check `result.success === true`
4. OG image aspect ratio: 3:2 (1200x800)
5. Genre values: lowercase (e.g., 'electronic' not 'Electronic')

**Safe to modify:**
- UI colors and styling
- Text content and labels
- Button positions
- Animation timings

---

## 📚 Key File Reference

| Feature | Primary File | Line References |
|---------|-------------|-----------------|
| Track Embed | `app/track/[id]/page.tsx` | 36-50 (metadata) |
| Tipping | `components/Player.tsx` | 69-128 (handleTip) |
| Tip Recording | `app/api/tracks/[id]/tip/route.ts` | 15-135 |
| Genre Filtering | `app/api/tracks/route.ts` | 17-20 |
| Profile Stats | `app/api/users/[username]/stats/route.ts` | 24-68 |
| Share Music | `components/ShareMusicModal.tsx` | 68-73 (submit) |
| OG Image | `app/api/og-image/route.tsx` | Full file |

---

*This document should be updated whenever critical features are modified or new features are added.*
