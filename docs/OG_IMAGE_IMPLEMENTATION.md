# Curio Digital Radio OG Image Implementation

## Overview

A dynamic OG (Open Graph) image generator that creates beautiful, Teenage Engineering-inspired 1200×800px images for track sharing on Curio Digital Radio.

## Endpoint

`/api/frame/[id]/og`

**Example**: `/api/frame/abc123/og`

## Features

### Visual Design (Teenage Engineering Inspired)

- **3:2 Aspect Ratio**: 1200×800px optimized for social sharing
- **Semi-circular Disc**: Album artwork displayed as a rotated half-disc on the left
- **Dynamic Background**: Gradient generated from album artwork's dominant colors
- **Neumorphic Design**: Soft shadows and highlights for depth
- **Curator Capsule**: Displays curator avatar, handle, and reputation score
- **Play Button**: Neumorphic play button with coral accent (#F36C5B)
- **Curio Branding**: Subtle logo placement

### Layout Specifications

| Element | Position | Size | Description |
|---------|----------|------|-------------|
| Canvas | — | 1200×800px | Base with dynamic gradient background |
| Semi-Disc | X: 260px, Y: 400px | Radius: 350px | Album art as left half-circle, rotated -10° |
| Song Title | X: 550px, Y: 290px | 48px, weight: 600 | Max 2 lines, color: #2E2E2E |
| Artist Name | X: 550px, Y: 360px | 28px, weight: 400 | Color: #5E5E5E |
| Curator Capsule | X: 550px, Y: 440px | 360×60px | Neumorphic pill with avatar, handle, score |
| Play Icon | X: 1080px, Y: 680px | 80px diameter | Neumorphic button with play triangle |
| Curio Logo | X: 1080px, Y: 720px | 24px | Opacity: 0.4 |

### Visual Effects

1. **Dynamic Background Gradient**
   - Extracts 2 dominant colors from album artwork
   - Lightens by 30% for subtle background
   - `linear-gradient(120deg, color1 0%, color2 80%)`

2. **Noise Texture Overlay**
   - 4% opacity grain texture for tactile realism
   - Adds depth without overwhelming the design

3. **Disc Highlight**
   - White specular gradient on right edge
   - Simulates "plastic reflection" effect

4. **Shadow System**
   - Consistent neumorphism: `6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff`
   - Inset shadows for play button depth

## Implementation Details

### Files Created

1. **`/app/api/frame/[id]/og/route.tsx`**
   - Main OG image generation endpoint
   - Uses @vercel/og for edge runtime rendering
   - Fetches track and curator data from Supabase
   - Implements dynamic color extraction

2. **`/lib/color-extractor.ts`**
   - Color extraction utility for edge runtime
   - Caches colors in database for performance
   - Includes color lightening helper function

3. **`/supabase/migrations/008_add_color_palette.sql`**
   - Adds `color_palette` column to `recommendations` table
   - Stores extracted colors as TEXT[] for caching

### Database Schema Update

```sql
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS color_palette TEXT[];
```

### Performance Optimizations

| Technique | Implementation | Benefit |
|-----------|---------------|---------|
| Edge Runtime | `export const runtime = 'edge'` | < 400ms response time |
| Edge Caching | `Cache-Control: public, max-age=3600` | Reuse for 1 hour |
| Color Caching | Store in `color_palette` column | Avoid re-extraction |
| Simple DOM | < 20 elements | Fast rendering |
| No External Fonts | System fonts only | No network fetches |

### Data Flow

```
1. Request: GET /api/frame/[id]/og
2. Fetch track data (title, artist, artwork, curator, stats)
3. Fetch curator data (username, avatar, score)
4. Check cached colors or extract from artwork
5. Generate dynamic gradient background
6. Render OG image with @vercel/og
7. Return 1200×800px image with 1-hour cache
```

## Usage

### Track Page Integration

The track metadata page (`/app/track/[id]/page.tsx`) automatically uses this endpoint:

```typescript
const artwork3x2 = `${baseUrl}/api/frame/${id}/og`;

// In OpenGraph metadata
openGraph: {
  images: [
    {
      url: artwork3x2,
      width: 1200,
      height: 800,
      alt: `${data.song_title} by ${data.artist}`,
    }
  ],
}
```

### Manual Testing

```bash
# View in browser
open http://localhost:3000/api/frame/YOUR_TRACK_ID/og

# Test with curl
curl http://localhost:3000/api/frame/YOUR_TRACK_ID/og > test.png
```

## Color Extraction

### How It Works

1. Fetches album artwork image
2. Samples pixel colors throughout the image
3. Calculates two dominant color averages
4. Lightens by 30% for background use
5. Caches in database for subsequent requests

### Fallback Colors

If extraction fails: `['#ECECEC', '#F6F6F6']` (Curio's default light gray gradient)

## Visual Checklist

- ✅ Album art appears as left half-disc with rotation
- ✅ Title + artist legible, not overlapping
- ✅ Curator badge visible with avatar and score
- ✅ Play button positioned bottom-right
- ✅ Curio logo subtle, not distracting
- ✅ Dynamic gradient from artwork colors
- ✅ Neumorphic shadows and highlights
- ✅ File size < 300KB, render < 500ms

## Future Enhancements

1. **Custom Fonts**: Add Neue Montreal and IBM Plex Mono
2. **Advanced Color Extraction**: Use vibrant.js for better color selection
3. **Image Optimization**: Pre-resize artwork to 700×700
4. **LRU Cache**: In-memory cache for frequently accessed images
5. **A/B Testing**: Track engagement metrics per design variant

## Troubleshooting

### Image Not Loading

1. Check track exists in database
2. Verify curator data is complete
3. Check artwork URL is accessible
4. Review server logs for errors

### Colors Look Wrong

1. Ensure artwork URL returns valid image
2. Check `color_palette` column for cached values
3. Test color extraction function directly
4. May need to clear cache and regenerate

### Performance Issues

1. Verify edge caching headers are set
2. Check color caching is working
3. Monitor database query performance
4. Consider adding CDN layer

## Technical Notes

- **Edge Runtime**: Required for optimal performance
- **Image Format**: Returns PNG by default
- **Font Fallback**: Uses system-ui for reliability
- **Error Handling**: Returns 404/500 with descriptive messages
- **CORS**: Inherits from Next.js configuration

## Migration

To apply the database migration:

```bash
# Using Supabase CLI
supabase db push

# Or run directly in Supabase dashboard:
cat supabase/migrations/008_add_color_palette.sql
```

## Credits

Design inspired by Teenage Engineering's minimalist aesthetic and Curio's neumorphic design system.
