# Curio Design Revamp - Tactile Digital Radio ✅

## Overview
Complete redesign implementing "Tactile Digital Radio" aesthetic - neumorphic light theme inspired by Teenage Engineering devices, Apple's skeuomorphism, and NTS Radio.

## Design System Changes

### Color Palette
**Before:** Dark forest green theme (#07110b → #0b1a12)
**After:** Light matte gray theme with muted accent colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Base Background | Matte Soft Gray | #ECECEC | Main canvas |
| Raised Surfaces | Light Neutral | #F6F6F6 | Cards, panels |
| Pressed Surfaces | Soft Gray | #D9D9D9 | Shadows |
| Accent 1 (Primary) | Muted Coral | #F36C5B | Primary actions, active states |
| Accent 2 | Mint Green | #B8E1C2 | Secondary modules |
| Accent 3 | Warm Mustard | #EFBF56 | Tips, badges |
| Text Primary | Charcoal Gray | #2E2E2E | High contrast |
| Text Secondary | Warm Gray | #5E5E5E | Metadata |

### Neumorphic Shadows
```css
/* Raised elements */
box-shadow: 8px 8px 16px #d0d0d0, -8px -8px 16px #ffffff;

/* Pressed elements */
box-shadow: inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff;
```

### Typography
- **Primary:** DM Sans (geometric sans-serif) - lowercase preferred
- **Mono:** IBM Plex Mono / Space Mono - for numbers, stats, timers
- **Letter spacing:** -0.02em for tighter, modern feel
- **Style:** lowercase for most UI text (radio station vibe)

### Border Radius
- Consistent 18px for all panels and cards
- Creates organic, "device-like" edges

### Subtle Noise Texture
- SVG noise overlay at 8% opacity
- Mix-blend-mode: overlay
- Adds analog, tactile feel to flat surfaces

## New Component Styles

### Buttons
1. **btn-neomorph** - Standard neumorphic button
   - Raised appearance
   - Tactile press feedback (scale 0.98)
   - 08ms transition (feels immediate)

2. **btn-accent** - Primary coral gradient button
   - Used for main CTAs (Tip, Submit)
   - Warm coral (#F36C5B) gradient

3. **btn-circular** - Circular knob-style buttons
   - 56px diameter (or custom)
   - Used for Play, Co-sign, Share
   - Feels like physical device buttons

### Cards
- **panel-surface** - Main neumorphic card with raised shadow
- **panel-surface-flat** - Lighter shadow for nested elements
- **card-tactile** - Interactive card with hover lift effect

### Inputs
- **input-shell** - Inset neumorphic input fields
- Pressed shadow appearance
- Coral focus ring

### Special Elements
- **led-dot** - Glowing LED indicator for playing tracks
  - Coral color with pulse animation
  - 8px circular dot

- **pill-tag** - Platform/genre tags
  - Neumorphic raised pill
  - Lowercase text
  - Subtle shadow

- **mono-number** - Monospace numbers for stats
  - Used for tips count, scores, timers
  - LED-style font

## Co-Sign Feature ✨

### New Functionality
- **Co-sign** - Free support for tracks (no USDC required)
- Encourages curator participation
- Helps build "curator score"

### Scoring System
- **Co-sign:** 1 point
- **Tip:** 5 points per USDC
- **Curator Score:** Displayed on profile

### UI Elements
- Circular Heart button (toggle switch metaphor)
- Fills coral when co-signed
- Shows count below icon
- Pressed state when active

## Components Updated

### 1. globals.css
- Complete color system overhaul
- Neumorphic shadow variables
- New button classes
- LED dot animation
- Noise texture overlay

### 2. MusicCard
**Changes:**
- Light background (#F6F6F6)
- Circular play button overlay (skeuomorphic)
- LED dot indicator when playing
- Lowercase text styling
- Tip counter with mustard color (#EFBF56)
- Card tactile hover effect

**Removed:**
- Dark gradient overlay
- Green accent colors
- Heart tip button

### 3. Player (Full Redesign)
**New Layout:**
- Light matte gray background (#ECECEC)
- Neumorphic header panel
- Circular control buttons
- Lowercase text throughout

**Co-Sign Integration:**
- Circular Heart button (left of Tip)
- Shows co-sign count
- Fills coral when signed
- Pressed state visual feedback

**Button Layout:**
- Co-sign (circular, left)
- Tip (accent coral, center - primary)
- Share (circular, right)
- Open in Platform (neumorphic text button)

**Visual Metaphors:**
- Play: Triangle in circular pad
- Co-sign: Heart toggle switch
- Tip: Coin slot (accent button)
- Share: Broadcast signal

### 4. Database Schema
**New Tables:**
- `co_signs` - Tracks user co-signs
  - `recommendation_id` (UUID)
  - `user_fid` (INTEGER)
  - Unique constraint prevents duplicates

**New Columns:**
- `recommendations.co_sign_count` (INTEGER)
- `users.curator_score` (INTEGER)
- `users.badges` (JSONB) - for future badge system

**Triggers:**
- Auto-update co_sign_count on insert/delete
- Auto-update curator_score on co-sign
- Auto-update curator_score on tip (5 pts/USDC)

## API Endpoints Added

### `/api/tracks/[id]/cosign` - POST
Creates a new co-sign for a track
- Validates user FID
- Prevents self-co-signing
- Prevents duplicate co-signs
- Returns updated count

### `/api/tracks/[id]/cosign/check` - GET
Checks if user has co-signed a track
- Query param: `userFid`
- Returns `hasCoSigned` boolean
- Returns `coSignCount` number

## Files Created
1. `migration-add-cosign.sql` - Database migration
2. `app/api/tracks/[id]/cosign/route.ts` - Co-sign endpoint
3. `app/api/tracks/[id]/cosign/check/route.ts` - Check endpoint
4. `DESIGN_REVAMP.md` - This document
5. `components/Player.tsx.backup` - Backup of old player

## Files Modified
1. `app/globals.css` - Complete redesign
2. `components/MusicCard.tsx` - Neumorphic redesign
3. `components/Player.tsx` - Full redesign with co-sign
4. `app/profile/page.tsx` - Badges "Coming Soon"
5. `app/curator/[username]/page.tsx` - Badges "Coming Soon"
6. `app/api/users/[username]/stats/route.ts` - Added FID to response

## Migration Steps

### 1. Run SQL Migrations
```sql
-- In Supabase SQL Editor:
-- 1. migration-add-badges.sql (from earlier)
-- 2. migration-add-cosign.sql (new)
```

### 2. Deploy Code
- All component changes are backward compatible
- No breaking API changes
- Profile endpoints now return FID

### 3. Testing Checklist
- [ ] Homepage displays cards with new neumorphic design
- [ ] Click track opens redesigned player
- [ ] LED dot appears when track is playing
- [ ] Co-sign button works (heart fills, count increments)
- [ ] Co-sign prevents duplicates
- [ ] Tip flow works with new button styles
- [ ] Share button maintains functionality
- [ ] Profile pages show "Coming Soon" for badges
- [ ] Stats display correctly with new styling

## Design Philosophy

### Emotional Feel
| Moment | Target Feeling |
|--------|----------------|
| Opening app | "Inside a beautifully crafted digital device" |
| Browsing tracks | "Flipping through radio station tiles" |
| Playing song | "Tuning into a hidden frequency" |
| Co-signing | "Flipping a physical toggle switch" |
| Tipping | "Inserting a coin; it clicked" |
| Profile | "Record collection display case" |

### Motion Principles
- **Fast:** 80-120ms transitions (feels immediate)
- **Tactile:** Scale down on press (0.95-0.98)
- **Precise:** No elastic bouncing
- **Physical:** Elements feel pressable, not slidey

### Visual Anchors
- Teenage Engineering OP-1 interface
- IKEA x Teenage Engineering Frekvens
- 2000s Apple GarageBand/iPod
- NTS Radio website layout
- Neumorphic design systems

## Next Steps (Future Enhancements)

1. **Profile Redesign**
   - Instrument panel header
   - 7-segment LED-style numbers for stats
   - Horizontal scrolling track cards

2. **Homepage Header**
   - Neumorphic navigation
   - Device control aesthetics

3. **Waveform Visualization**
   - Tiny glowing bars for now playing
   - Looping ease-in-out pulse

4. **Sound Design**
   - Subtle click feedback on button press
   - Radio static fade-in (optional)

5. **Cursor Enhancement**
   - Small glowing dot with trail
   - Motion blur on hover (optional)

6. **Badge System**
   - Dynamic badge earning
   - Display from database
   - Achievement notifications

7. **Curator Score Leaderboard**
   - Top curators by score
   - Weekly/monthly rankings

## Breaking Changes
None - all changes are additive or visual only.

## Performance Notes
- SVG noise texture is inline (no HTTP request)
- Neumorphic shadows use standard CSS (GPU accelerated)
- Lowercase transformation is CSS-only
- LED animation is CSS keyframes (performant)
