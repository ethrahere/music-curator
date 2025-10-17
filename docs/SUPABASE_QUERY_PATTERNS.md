# Supabase Query Patterns

## Database Schema Reference

### Foreign Key Relationships

The `recommendations` table has the following foreign key to `users`:
- **Column**: `curator_fid`
- **References**: `users.farcaster_fid`
- **Named relationship**: `curator`

## Correct Query Patterns

### ✅ Fetching Tracks with Curator Info

```typescript
const { data, error } = await supabase
  .from('recommendations')
  .select('*, curator:users!curator_fid(farcaster_fid, username, curator_score)')
  .eq('id', id)
  .single();
```

**Access the joined data:**
```typescript
const track = {
  id: data.id,
  sharedBy: {
    fid: data.curator?.farcaster_fid || 0,
    username: data.curator?.username || 'unknown',
    curatorScore: data.curator?.curator_score || 0,
  }
};
```

### ❌ Incorrect Patterns (Do Not Use)

```typescript
// WRONG - Old foreign key name
.select('*, users!recommendations_curator_address_fkey(...)')

// WRONG - Incorrect foreign key syntax
.select('*, users!recommendations_curator_fid_fkey(...)')

// WRONG - Accessing with wrong property name
data.users?.farcaster_fid  // Should be: data.curator?.farcaster_fid
```

## Why This Matters

If you use the wrong foreign key syntax:
1. Supabase will return an error
2. The API will return 404 "Track not found"
3. The `/play` page will fail to load tracks
4. Frame embeds will show errors when clicking Play button

## Quick Reference

| Operation | Correct Pattern |
|-----------|----------------|
| **Join syntax** | `curator:users!curator_fid(...)` |
| **Access data** | `data.curator?.farcaster_fid` |
| **Foreign key** | `curator_fid` references `users.farcaster_fid` |

## Files Using This Pattern

All of these files must use the correct pattern:
- `/app/api/tracks/route.ts` ✅ (reference implementation)
- `/app/api/tracks/[id]/route.ts` ✅ (fixed)
- `/app/api/users/[username]/tracks/route.ts` (check if needed)

## Troubleshooting

If you see "Track not found" errors:
1. Check the Supabase query uses `curator:users!curator_fid`
2. Check data access uses `data.curator?.`
3. Check server logs for Supabase errors
4. Verify the track exists: `SELECT * FROM recommendations WHERE id = '...'`

## Migration History

- **Original**: Used `curator_address` (text field)
- **Migrated to**: `curator_fid` (integer, proper foreign key)
- **Named relationship**: `curator` for cleaner access
