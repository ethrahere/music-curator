# Music Curator - Farcaster Mini App

A music discovery and curation app for Farcaster. Share and discover tracks from YouTube Music, Spotify, SoundCloud, Bandcamp, and more.

## Features

- **Submit Music**: Paste links from supported platforms and share them to Farcaster
- **Automatic Metadata Extraction**: Uses oEmbed APIs to fetch track info, artwork, and embeds
- **Mini App Embeds**: Tracks appear in Farcaster feeds with play buttons and artwork
- **Player View**: Full-screen player with embedded streaming from original platforms
- **Discovery Feed**: Browse recently shared music and top-tipped tracks
- **Tipping System**: Support artists and curators with tips (numbers for now, tokenizable later)
- **Dark Mode Design**: Glassmorphic UI with smooth animations

## Supported Platforms

- YouTube / YouTube Music
- Spotify
- SoundCloud
- Bandcamp

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **SDK**: @farcaster/frame-sdk
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd music-curator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local .env.local
# Edit .env.local and set NEXT_PUBLIC_BASE_URL to your domain
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Testing with Cloudflared (for local development)

To test Farcaster embeds locally, use cloudflared:

```bash
cloudflared tunnel --url http://localhost:3000
```

This will give you a public URL that you can use to test embeds at [warpcast.com/~/developers/embeds](https://warpcast.com/~/developers/embeds)

## Project Structure

```
music-curator/
├── app/
│   ├── api/
│   │   └── tracks/          # API routes for track CRUD operations
│   ├── feed/                # Discovery feed page
│   ├── play/                # Player page (opened from embeds)
│   ├── track/[id]/          # Individual track pages with meta tags
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page with submit form
├── components/
│   ├── MusicCard.tsx        # Track card for feed display
│   ├── Player.tsx           # Full-screen music player
│   └── SubmitForm.tsx       # Music link submission form
├── lib/
│   ├── farcaster.ts         # Farcaster SDK utilities
│   ├── music-parser.ts      # URL parsing & metadata extraction
│   └── store.ts             # In-memory track storage
├── types/
│   └── music.ts             # TypeScript types
└── public/
    └── .well-known/
        └── farcaster.json   # Mini App manifest
```

## Key Files

### Farcaster Manifest

Located at `public/.well-known/farcaster.json`, this defines your Mini App metadata:

```json
{
  "miniapp": {
    "version": "1",
    "name": "Music Curator",
    "homeUrl": "https://your-domain.app/",
    "primaryCategory": "music"
  }
}
```

### Track Pages with fc:miniapp Meta Tags

Each track at `/track/[id]` includes the `fc:miniapp` meta tag for proper Farcaster embed rendering:

```typescript
{
  "version": "1",
  "imageUrl": "[track artwork]",
  "button": {
    "title": "▶ Play",
    "action": {
      "type": "launch_frame",
      "url": "/play?trackId=[id]"
    }
  }
}
```

## SDK Integration

### Initializing the SDK

```typescript
import sdk from '@farcaster/frame-sdk';

await sdk.actions.ready(); // Hide splash screen
```

### Getting User Context

```typescript
const context = await sdk.context;
const user = {
  fid: context.user?.fid,
  username: context.user?.username
};
```

### Sharing to Farcaster

```typescript
await sdk.actions.composeCast({
  text: "🎵 Check out this track",
  embeds: ["https://your-domain.app/track/123"]
});
```

## API Routes

### GET /api/tracks
Get tracks with optional sorting:
- `?sort=recent` - Recently shared (default)
- `?sort=most_tipped` - Top tipped tracks
- `?limit=20` - Limit results (default: 20)

### POST /api/tracks
Submit a new track:
```json
{
  "id": "timestamp",
  "url": "https://youtube.com/watch?v=...",
  "platform": "youtube",
  "title": "Track Title",
  "artist": "Artist Name",
  "artwork": "https://...",
  "embedUrl": "https://youtube.com/embed/...",
  "tips": 0,
  "sharedBy": { "fid": 123, "username": "user" },
  "timestamp": 1234567890
}
```

### GET /api/tracks/[id]
Get a single track by ID

### POST /api/tracks/[id]
Tip a track:
```json
{
  "action": "tip"
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app`
4. Deploy

### Update Farcaster Manifest

After deployment, update `public/.well-known/farcaster.json` with your production domain:

```json
{
  "accountAssociation": {
    "header": "[base64 header]",
    "payload": "[base64 payload]",
    "signature": "[base64 signature]"
  },
  "miniapp": {
    "iconUrl": "https://your-domain.vercel.app/icon.png",
    "homeUrl": "https://your-domain.vercel.app/",
    "splashImageUrl": "https://your-domain.vercel.app/splash.png"
  }
}
```

### Account Association

To generate proper account association credentials:

1. Follow [Farcaster Account Association docs](https://docs.farcaster.xyz)
2. Use your Farcaster account's private key to sign the domain
3. Update the manifest with the generated signature

## Testing Embeds

1. Deploy your app or use cloudflared for local testing
2. Share a track to get the `/track/[id]` URL
3. Test the embed at: [warpcast.com/~/developers/embeds](https://warpcast.com/~/developers/embeds)
4. Verify the Mini App button appears in the embed

## Development Tips

### Adding New Music Platforms

1. Update `detectPlatform()` in `lib/music-parser.ts`
2. Add extraction logic for the platform
3. Add oEmbed URL if available
4. Update type definition in `types/music.ts`

### Customizing Player Embeds

Modify the iframe rendering logic in `components/Player.tsx` based on platform requirements.

### Persistent Storage

The current implementation uses in-memory storage (`lib/store.ts`). For production, consider:

- PostgreSQL with Prisma
- Supabase
- Firebase Firestore
- PlanetScale

## Known Limitations

- In-memory storage (resets on server restart)
- Placeholder account association (use real credentials in production)
- Tips are just numbers (implement token transfers later)
- Some platforms may block iframe embeds (CORS/X-Frame-Options)

## Future Enhancements

- [ ] Persistent database storage
- [ ] Real account association with signature verification
- [ ] Token-based tipping system
- [ ] Playlist curation
- [ ] Search and filtering
- [ ] User profiles
- [ ] Social features (follows, comments)
- [ ] Analytics dashboard

## Resources

- [Farcaster Mini Apps Docs](https://docs.farcaster.xyz)
- [Frame SDK](https://github.com/farcasterxyz/frame-sdk)
- [Warpcast Embed Tester](https://warpcast.com/~/developers/embeds)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for the Farcaster community
