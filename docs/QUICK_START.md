# Quick Start - Deploy Curio Redesign

## Step 1: Run Database Migrations (REQUIRED)

Open Supabase SQL Editor and run these files in order:

### Migration 1: Badges
```sql
-- Copy and paste from: migration-add-badges.sql
-- Adds: users.badges column (JSONB)
```

### Migration 2: Co-Sign
```sql
-- Copy and paste from: migration-add-cosign.sql
-- Adds:
--   - co_signs table
--   - recommendations.co_sign_count
--   - users.curator_score
--   - Triggers for auto-updating counts
```

## Step 2: Deploy

### Option A: Auto-Deploy (Vercel/Netlify)
```bash
git add .
git commit -m "feat: Neumorphic design + co-sign feature"
git push origin main
```

### Option B: Manual Deploy
```bash
npm run build
# Deploy .next folder to your hosting
```

## Step 3: Test

1. **Open app** - Should see light gray background
2. **Click a track** - Opens redesigned player
3. **Click heart button** - Co-signs the track (fills coral)
4. **Try to co-sign again** - Should be prevented
5. **Tip a track** - Works as before with new button styles

## That's It! 🎉

### New Features
- ✅ Co-sign tracks (free support)
- ✅ Curator score system
- ✅ Neumorphic light theme
- ✅ Circular button controls
- ✅ LED playing indicators

### What Changed
- **Design:** Dark green → Light gray neumorphic
- **Typography:** Now lowercase for radio vibe
- **Buttons:** Circular knob-style controls
- **New:** Co-sign button (heart) next to tip

### Files to Reference
- `DESIGN_REVAMP.md` - Full design documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `migration-add-cosign.sql` - Database schema
