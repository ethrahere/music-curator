# Curio Frame Page - Final Implementation ✅

## Correct Implementation

Following the exact specifications, the Player now implements:

### Visual Hierarchy

```
<FrameView>
 ├── <HeaderBar>
 │    └── Curio logo (/curio.png) + X button
 │
 ├── <TrackCard>
 │    ├── Embedded Player (iframe - Spotify/SoundCloud/YouTube)
 │    ├── Track Title + Artist
 │    ├── CaptionText ("for your walk home at 2 AM")
 │    └── CuratorInfo (avatar, @username, platform pill)
 │
 ├── <ActionBar> (Fixed Bottom)
 │    ├── [❤️ Co-sign Button] (Coral accent #F36C5B)
 │    └── [💵 Tip Button] (Mint accent #B8E1C2)
 │
 ├── <SocialProofBar> (Above ActionBar)
 │    └── "💫 12 Co-signs · 💸 $0.08 Tipped"
 │
 └── <ToastFeedback> (Top Center)
      └── Appears top center (fades after 2s)
```

## Key Changes from Previous

### ✅ What Was Fixed

1. **Removed album art square** - No separate album display
2. **Iframe at top** - Player is the main visual element
3. **Used curio.png** - From public folder in header
4. **Caption text** - Placeholder italic text below track info
5. **Correct button order** - Co-sign (left/coral), Tip (right/mint)
6. **Simplified layout** - Single card with iframe + info

### Component Structure

#### HeaderBar
```tsx
<div className="panel-surface">
  <button onClick={onClose}>X</button>
  <Image src="/curio.png" width={80} height={24} />
</div>
```

#### TrackCard
```tsx
<div className="panel-surface">
  {/* Embedded Player - Full Width */}
  <iframe src={track.embedUrl} />

  {/* Track Info */}
  <div className="p-6">
    <h1>{track.title}</h1>
    <p>{track.artist}</p>
    <p className="italic">"for your walk home at 2 AM"</p>

    {/* Curator Card */}
    <Link href={`/curator/${username}`}>
      <div className="panel-surface-flat">
        <Avatar />
        <span>@{username}</span>
        <Pill>{platform}</Pill>
      </div>
    </Link>
  </div>
</div>
```

#### ActionBar (Fixed Bottom)
```tsx
<div className="fixed bottom-0">
  {/* SocialProofBar */}
  <p>💫 {coSignCount} Co-signs · 💸 ${tipTotal} Tipped</p>

  {/* Two Large Buttons */}
  <div className="grid grid-cols-2 gap-4">
    <button className="btn-neomorph" onClick={handleCoSign}>
      <Heart /> co-sign
    </button>

    <button style={{background: mintGradient}} onClick={openTip}>
      <DollarSign /> tip
    </button>
  </div>
</div>
```

## UI States

### Co-sign Button
- **Default:** Gray heart, neumorphic raised, "co-sign"
- **Signing:** "signing..." text
- **Signed:** Coral filled heart, pressed state, "co-signed 💫"
- **After tip:** Coral glow for 500ms

### Tip Button
- **Default:** Mint gradient (#B8E1C2), "tip"
- **Active:** Shows tip amount selector above
- **Success:** Pulsing glow for 3s

### Toasts
- **Co-sign:** "+1 Co-sign added 💫"
- **Tip:** "Tip sent 💸"
- **Error:** "Already co-signed" / "Transaction failed"
- Auto-dismiss: 2 seconds
- Animation: Fade-in + slide-down

## Animations

### Co-sign Button (Coral #F36C5B)
```css
default: neumorphic raised
hover: scale(1.02)
click: pressed (inset shadow)
after co-sign: filled coral heart
after tip: glow-border animation (500ms)
```

### Tip Button (Mint #B8E1C2)
```css
default: mint gradient
hover: lift
click: show tip selector
after success: pulse + mint glow (3s)
```

## Flow

1. **Open Player** → Shows iframe + track info
2. **Listen** → Embedded player controls
3. **Co-sign** (free):
   - Click co-sign button
   - Toast: "+1 Co-sign added 💫"
   - Button becomes pressed, heart fills
   - Count updates in SocialProofBar
4. **Tip** (USDC):
   - Click tip button
   - Selector appears
   - Choose amount → OnchainKit modal
   - Toast: "Tip sent 💸"
   - Button glows mint
   - Co-sign button glows coral (500ms)
   - Count updates

## No Backend Changes

- All APIs remain unchanged
- Co-sign: `POST /api/tracks/${id}/cosign`
- Tip: `POST /api/tracks/${id}/tip`
- Check: `GET /api/tracks/${id}/cosign/check`
- Same logic, new UI only

## Design System

### Colors
- **Coral** (#F36C5B) - Co-sign accent
- **Mint** (#B8E1C2) - Tip accent
- **Base** (#ECECEC) - Background
- **Surface** (#F6F6F6) - Cards

### Typography
- **Titles:** Lowercase, tight spacing
- **Numbers:** Monospace (LED-style)
- **Body:** Regular weight

### Spacing
- **ActionBar buttons:** py-8 (64px height)
- **Bottom padding:** pb-40 (160px clearance)
- **Card padding:** p-6 (24px)

## Build Status
✅ **Build successful** - No errors

## Files Modified
1. `components/Player.tsx` - Complete rewrite
2. `app/globals.css` - Added glow-border animation

## What This Achieves
✅ Iframe player is the main focus
✅ Clean, simple hierarchy
✅ No album art duplication
✅ Correct button colors (coral/mint)
✅ Proper visual hierarchy
✅ Tactile device aesthetic
✅ Clear emotional flow: listen → feel → reward
