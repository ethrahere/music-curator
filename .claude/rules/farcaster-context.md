# Farcaster Context and Address Resolution Rules

## DO NOT Use External APIs for Address Lookup
- ❌ DO NOT use Neynar API for address lookups
- ❌ DO NOT use external Farcaster Hub APIs
- ❌ DO NOT add third-party API dependencies for user data

## USE Farcaster Frame SDK Context
- ✅ USE `sdk.context` to get user information
- ✅ The Farcaster Frame SDK provides user context including:
  - `context.user.fid` - User's Farcaster ID
  - `context.user.username` - User's username
  - `context.user.pfpUrl` - Profile picture
  - `context.user.verifications` - Connected wallet addresses

## For Tipping / Wallet Addresses
When you need a user's wallet address for tipping:

1. **Get from Farcaster Context**: The curator's verified addresses should be accessible via the Frame SDK
2. **Store on Track Creation**: When a curator shares a track, store their verified address alongside the track
3. **Use Direct Transfers**: For USDC tips, use wagmi `writeContract` to transfer directly to the stored address

## Architecture
```
User shares track → SDK provides context.user.verifications → Store curator address in DB
User tips → Load curator address from DB → Direct USDC transfer via wagmi
```

## Why This Approach?
- No external API dependencies
- Faster (no API calls needed)
- More reliable
- Works offline/locally
- Lower cost (no API rate limits)
