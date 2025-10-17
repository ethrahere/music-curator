# Curio Frame Page Rebuild ✅

## Overview
Rebuilt the Player component as the emotional center of Curio - where listeners hear a track, feel something, and reward the curator through co-signs and tips.

## Design Goal
**"Operating a digital music device — tactile, simple, premium"**

## New Structure

### 1️⃣ HeaderBar
- **Logo:** "curio" in lowercase (device branding)
- **Close button:** Circular X button (tactile)
- **Navigation:** Previous/Next track buttons (when in playlist)

### 2️⃣ TrackCard (Main Visual Block)
**Album Art:**
- Full-width square aspect ratio
- Neumorphic bezel shadow (12px depth)
- Hover: Play button overlay with coral glow
- Click play: Smooth scroll to embedded player

**Track Info:**
- Title & Artist: Centered, lowercase, tight letter-spacing
- Curator card: Clickable with avatar gradient, platform pill
- Embedded player: Spotify/SoundCloud/YouTube iframe with bezel

### 3️⃣ ActionBar (Fixed Bottom)
**Two Large Tactile Buttons:**

**Co-sign Button (Left):**
- Heart icon (8x8 size)
- States:
  - Default: Gray heart, neumorphic raised
  - Signing: "signing..." text
  - Signed: Coral filled heart, pressed state
- Hover: Scale 1.02
- After tip success: Mint glow (3s)

**Tip Button (Right):**
- Dollar icon (8x8 size)
- Coral gradient (accent button)
- States:
  - Default: Coral gradient
  - Active: Shows tip amount selector
  - Success: Pulsing glow (3s)
- Hover: Lift with shadow

### 4️⃣ SocialProofBar (Above ActionBar)
- **Format:** `💫 12 co-signs · 💸 $0.08 tipped`
- **Font:** Monospace numbers (LED-style)
- **Color:** Secondary gray (#5E5E5E)
- **Updates:** Live after co-sign/tip actions

### 5️⃣ ToastFeedback (Top Center)
**Success Toasts:**
- `💫 Co-sign added!`
- `💸 $5 tip sent!`

**Error Toasts:**
- Red background
- Auto-dismiss after 2 seconds
- Slide-in animation from top

## User Flow

### Flow 1: Co-sign
1. User clicks track → Player opens
2. Views album art, curator info
3. Scrolls to ActionBar
4. Clicks **Co-sign button** (heart)
5. Toast appears: "💫 Co-sign added!"
6. Button becomes pressed (coral filled heart)
7. SocialProofBar updates: `💫 13 co-signs`
8. Mint glow on button for 3s

### Flow 2: Tip
1. User in Player
2. Clicks **Tip button** (dollar)
3. Tip selector appears (inline, above ActionBar)
4. Selects $1, $5, $10, or custom amount
5. OnchainKit modal opens
6. Confirms transaction
7. Toast appears: "💸 $5 tip sent!"
8. Tip selector closes
9. SocialProofBar updates: `💸 $0.13 tipped`
10. Tip button glows coral for 3s

### Flow 3: Play
1. Hover album art
2. Circular play button appears with glow
3. Click play
4. Smooth scroll to embedded player
5. Music starts

## Visual Hierarchy

```
┌─────────────────────────────────────┐
│ [X] curio            [<] [>]        │ HeaderBar
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      Album Art Square       │   │ TrackCard
│  │    (Hover: Play Button)     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│          track title                │
│           by artist                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [@] curated by @username    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Embedded Player (iframe)  │   │
│  └─────────────────────────────┘   │
│                                     │
│     [open in spotify]               │
│     [share track]                   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  💫 12 co-signs · 💸 $0.08 tipped   │ SocialProofBar
│                                     │
│  ┌──────────────┐ ┌──────────────┐ │
│  │      ❤️      │ │      💵      │ │ ActionBar
│  │   co-sign    │ │      tip     │ │
│  └──────────────┘ └──────────────┘ │
└─────────────────────────────────────┘
```

## Animations & Micro-interactions

### Play Button
```css
hover: box-shadow: 0 0 10px rgba(243, 108, 91, 0.4);
click: scale(0.98) + scroll to player
```

### Co-sign Button
```css
default: neumorphic raised
hover: scale(1.02)
active: pressed (inset shadow)
after tip: mint glow (0 0 20px rgba(184, 225, 194, 0.6))
duration: 80ms (feels immediate)
```

### Tip Button
```css
default: coral gradient
hover: lift shadow
click: show tip selector
after success: coral glow + pulse (0 0 20px rgba(243, 108, 91, 0.6))
duration: 80ms
```

### Toast
```css
enter: fade-in + slide-in-from-top-2
duration: 200ms
auto-dismiss: 2000ms
```

### Album Art Overlay
```css
default: opacity 0
hover: opacity 100 + bg-black/10
transition: 120ms
```

## State Management

### Co-sign States
- `coSigning` - Boolean (loading)
- `hasCoSigned` - Boolean (already signed)
- `coSignCount` - Number (live count)

### Tip States
- `tipping` - Boolean (loading)
- `tipSuccess` - Boolean (3s glow)
- `showTipAmounts` - Boolean (selector visible)
- `localTipTotal` - Number (optimistic UI update)

### Toast States
- `toasts` - Array of `{ id, message, type }`
- Auto-remove after 2s
- Stack vertically if multiple

## API Integration

### On Load
```typescript
GET /api/tracks/${track.id}/cosign/check?userFid=${user.fid}
→ Returns: hasCoSigned, coSignCount
```

### Co-sign Action
```typescript
POST /api/tracks/${track.id}/cosign
Body: { userFid }
→ Returns: success, coSignCount
→ Updates: co_signs table, curator_score
→ Toast: "💫 Co-sign added!"
```

### Tip Action
```typescript
1. sdk.actions.sendToken() → USDC transfer
2. POST /api/tracks/${track.id}/tip
   Body: { txHash, fromFid, toFid, amount, ... }
→ Returns: success
→ Updates: tips table, curator_score (5pts/USDC)
→ Toast: "💸 $X tip sent!"
```

## Design System Classes Used

```css
/* Buttons */
.btn-circular      /* Navigation, close */
.btn-neomorph      /* Co-sign, share, platform */
.btn-accent        /* Tip (coral gradient) */

/* Surfaces */
.panel-surface     /* Header, toasts */
.panel-surface-flat /* Curator card, up next */

/* Effects */
.pressed           /* Co-signed state */
.led-dot           /* (future: playing indicator) */
.mono-number       /* Social proof stats */

/* Animations */
animate-in fade-in slide-in-from-top-2  /* Toast enter */
animate-pulse                           /* Tip success */
hover:scale-[1.02]                      /* Button hover */
```

## No Logic Changes
- All existing API endpoints remain the same
- Co-sign functionality works as before
- Tip flow identical (OnchainKit SDK)
- Only visual reorganization + new toast system

## Testing Checklist

### Visual
- [ ] Album art displays with neumorphic bezel
- [ ] Play button appears on hover with glow
- [ ] Curator card shows avatar, username, platform
- [ ] ActionBar buttons are large and accessible
- [ ] SocialProofBar displays counts correctly
- [ ] Lowercase text throughout

### Interactions
- [ ] Co-sign button: Click → Toast → Filled heart → Count++
- [ ] Co-sign button: Already signed → Pressed state
- [ ] Tip button: Click → Selector → Amount → Modal → Toast
- [ ] Tip button: Success → Glow 3s → Count update
- [ ] Play button: Click → Scroll to player
- [ ] Toast: Appears → Fades after 2s

### States
- [ ] Co-sign disabled when already signed
- [ ] Tip button glows after successful tip
- [ ] Co-sign gets mint glow after tip
- [ ] Counts update immediately (optimistic)

### Mobile
- [ ] ActionBar buttons touchable (py-6 = 48px+ height)
- [ ] Album art square on all screens
- [ ] ScrollView works with fixed bottom bar
- [ ] Toasts don't cover important content

## Performance
- Album art uses `priority` for LCP
- Toasts use CSS animations (60fps)
- Local state updates (optimistic UI)
- Smooth scroll uses `scrollIntoView({ behavior: 'smooth' })`

## Emotional Design Achieved
✅ "Operating a digital music device"
✅ "Tactile, simple, premium"
✅ "Clear emotional flow: see → play → feel → reward"
✅ "Immediate feedback on every action"
✅ "Physical button metaphors"

## Future Enhancements
1. Waveform visualization below album art
2. Sound effects on button press (click.wav)
3. Confetti animation on large tips
4. Caption text from curator (recommendation context)
5. Live listener count ("12 listening now")
