# Curio Documentation

Welcome to the Curio documentation! This directory contains comprehensive guides for understanding and working with the Curio music curation platform.

## Table of Contents

### Getting Started
- [Quick Start Guide](./QUICK_START.md) - Set up and run the project locally

### Core Features
- [Curator Score System](./CURATOR_SCORE.md) - How curator reputation scoring works
- [Tipping System](./TIPPING_FIX.md) - USDC tipping implementation on Base
- [Co-sign Feature](./FRAME_REBUILD.md) - User engagement and co-signing

### Technical Documentation
- [Database Schema & Queries](./SUPABASE_QUERY_PATTERNS.md) - Supabase patterns and best practices
- [API Routes](./API_ROUTES_AUDIT.md) - Complete API endpoint reference
- [OG Image Generation](./OG_IMAGE_IMPLEMENTATION.md) - Dynamic social preview images

### Design & Architecture
- [Design System](./DESIGN_REVAMP.md) - UI/UX design principles and components
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - High-level architecture overview

## Key Concepts

### What is Curio?

Curio is a decentralized music curation platform built on Farcaster where:
- Users discover music through trusted curators
- Curators build reputation by sharing quality tracks
- Community shows appreciation via co-signs (free) and tips (USDC)
- Reputation is quantified through a transparent scoring system

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Farcaster Mini App                   │
│                  (Warpcast Client)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Frame SDK
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Next.js 15.5.4 (Turbopack)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   API Routes │  │  Components  │  │  Pages/App   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
       ┌─────────────┐    ┌──────────────────┐
       │  Supabase   │    │   Base Network   │
       │  PostgreSQL │    │  (USDC Tipping)  │
       └─────────────┘    └──────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 15.5.4 with React 19, TypeScript
- **Styling**: Tailwind CSS with custom neumorphic design system
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Base (USDC tipping)
- **Platform**: Farcaster Frame SDK (Mini Apps)
- **Deployment**: Vercel

## Quick Links

### For Developers
- **Setup**: See [QUICK_START.md](./QUICK_START.md)
- **API Reference**: See [API_ROUTES_AUDIT.md](./API_ROUTES_AUDIT.md)
- **Database Queries**: See [SUPABASE_QUERY_PATTERNS.md](./SUPABASE_QUERY_PATTERNS.md)

### For Product/Design
- **Design System**: See [DESIGN_REVAMP.md](./DESIGN_REVAMP.md)
- **Features**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

### For Admins
- **Scoring Config**: See [CURATOR_SCORE.md](./CURATOR_SCORE.md)
- **Tipping System**: See [TIPPING_FIX.md](./TIPPING_FIX.md)

## Environment Variables

Required environment variables (see `.env.local.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Farcaster (optional)
FARCASTER_NOTIFICATION_URL=notification-endpoint

# App
NEXT_PUBLIC_BASE_URL=your-deployed-url
```

## Project Structure

```
music-curator/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── curator/           # Curator profile pages
│   ├── track/             # Track detail pages
│   └── page.tsx           # Home/feed page
├── components/            # React components
│   ├── MusicCard.tsx     # Track card component
│   ├── Player.tsx        # Full-screen player
│   └── ...
├── lib/                   # Utility libraries
│   ├── curator-score.ts  # Score calculation logic
│   ├── constants.ts      # App constants
│   ├── farcaster.ts      # Farcaster SDK utils
│   └── supabase.ts       # Supabase client
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── docs/                 # Documentation (you are here!)
└── public/               # Static assets
```

## Contributing

When adding new features:

1. **Update migrations** in `supabase/migrations/`
2. **Document API changes** in [API_ROUTES_AUDIT.md](./API_ROUTES_AUDIT.md)
3. **Add tests** for new functionality
4. **Update relevant docs** in this folder

## Support

For questions or issues:
- Create an issue on GitHub
- Check existing documentation first
- Review [QUICK_START.md](./QUICK_START.md) for common setup issues

## License

[Add your license here]
