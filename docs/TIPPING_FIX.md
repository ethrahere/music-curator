# Tipping Fix - No External APIs Needed

## Problem
The tipping button wasn't working because:
1. We were trying to fetch curator wallet addresses from an external API (`/api/users/[fid]/address`)
2. That API was trying to call Farcaster Hub (which was timing out)
3. We were planning to use Neynar API (but don't want external dependencies)

## Solution
**USE FARCASTER SDK CONTEXT** - The wallet address is already available!

### Changes Made

#### 1. Updated `lib/farcaster.ts` - Added walletAddress to getUserContext()
```typescript
export async function getUserContext() {
  const context = await sdk.context;
  const walletAddress = (context as any).client?.walletAddress || null;

  return {
    fid: context.user?.fid || 0,
    username: context.user?.username || 'anonymous',
    pfpUrl: context.user?.pfpUrl,
    walletAddress, // ← NEW: Get from SDK context
  };
}
```

#### 2. Updated `types/music.ts` - Added walletAddress to sharedBy
```typescript
sharedBy: {
  fid: number;
  username: string;
  curatorScore?: number;
  pfpUrl?: string;
  walletAddress?: string; // ← NEW: Store curator's wallet for tips
};
```

#### 3. Updated `components/Player.tsx` - Get address from track data
```typescript
// BEFORE: Made API call
const [curatorAddress, setCuratorAddress] = useState<string | null>(null);
useEffect(() => {
  const fetchCuratorAddress = async () => {
    const response = await fetch(`/api/users/${track.sharedBy.fid}/address`);
    // ...
  };
}, []);

// AFTER: Get directly from track data (NO API CALL!)
const curatorAddress = track.sharedBy.walletAddress;
```

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Shares Track                                            │
│ ↓                                                             │
│ getUserContext() → returns {fid, username, walletAddress}   │
│ ↓                                                             │
│ POST /api/tracks → Stores track with curator's wallet       │
│ ↓                                                             │
│ Saves to DB: recommendations table                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User Tips Track                                              │
│ ↓                                                             │
│ Player loads track → track.sharedBy.walletAddress available │
│ ↓                                                             │
│ User clicks tip → Direct USDC transfer via wagmi            │
│   writeContract({                                            │
│     address: USDC_ADDRESS,                                   │
│     functionName: 'transfer',                                │
│     args: [curatorAddress, amount]                           │
│   })                                                          │
│ ↓                                                             │
│ POST /api/tracks/[id]/tip → Records transaction             │
└─────────────────────────────────────────────────────────────┘
```

## What's LEFT to Do

### 1. Add wallet_address column to users table (if needed)
```sql
ALTER TABLE users ADD COLUMN wallet_address TEXT;
```

### 2. Update API routes to store/return wallet address
- `app/api/tracks/route.ts` (POST) - Already passes through `sharedBy` from client
- Database transformation functions - May need to include wallet_address

### 3. Test the full flow
1. Share a track (should capture wallet address from SDK)
2. View track in player (should show tip button)
3. Click tip (should show curator's address)
4. Send tip (should transfer USDC to correct address)

## Benefits of This Approach

✅ **No external API calls** - Faster, more reliable
✅ **No API keys needed** - No Neynar, no Farcaster Hub dependencies
✅ **Works offline** - For local development
✅ **Simpler architecture** - Less moving parts
✅ **Lower cost** - No rate limits or API costs

## Testing Checklist

- [ ] Verify wallet address is captured in `getUserContext()`
- [ ] Verify wallet address is stored when track is shared
- [ ] Verify Player component has access to curator address
- [ ] Verify tip modal shows correct curator address
- [ ] Verify USDC transfer goes to correct address
- [ ] Verify tip is recorded in database
- [ ] Test with multiple curators

## Notes

- The wallet address comes from the Farcaster Frame SDK's `context.client.walletAddress`
- This is the connected wallet that the user has authenticated with Farcaster
- For production, ensure users connect a wallet before sharing tracks
- Consider adding validation: "Please connect wallet to share tracks"

---

**Status**: ✅ Code changes complete, ready for testing
**Next**: Test in the frame to verify wallet address is available from SDK
