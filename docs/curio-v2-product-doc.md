# Curio v2: Music Curation Meets Community

## Vision

Curio is where music tastemakers build paid communities on Base. We're creating a music-specific social layer where curator identity is distinct from general social presence, and where sharing great music directly builds economic and social value.

## The Problem We're Solving

**For Music Curators:**
- Their music shares get lost in general social feeds
- No way to monetize their curation work directly
- Can't build a dedicated following around their music taste
- No clear reputation system for tastemaking

**For Music Lovers:**
- Hard to find consistent, trustworthy music curators in specific genres
- No way to financially support curators they value
- Missing the community aspect around shared music taste
- Algorithm-driven discovery lacks the human touch

## Core Insight

People on Base already have creator coins. Instead of creating new economic primitives, we make music curation the compelling reason to buy and hold existing creator coins. Your coin becomes your music community's access token.

## How It Works

### For Curators
1. Connect your Base wallet (with existing creator coin)
2. Set up your curator profile with genres/vibes you curate
3. Share music - each share is visible to your coin holders
4. Build reputation through consistent, quality curation
5. Grow your community as more people buy your coin for music access

### For Listeners
1. Connect your Base wallet
2. Discover curators by genre, vibe, or trending activity
3. Find a curator whose taste aligns with yours
4. Buy their creator coin = join their music community
5. Access their curated shares and connect with other community members

### The Economic Loop
- Great curation → People buy curator's coin → Curator earns + coin value increases → More motivation to curate → Community grows → More value for all holders

## Product Structure

### 1. Home Feed
**What:** Personalized feed of music shares from communities you're in

**Features:**
- Shows shares from all curators whose coins you hold
- Grouped by community with visual separation
- Each share shows: track preview, curator note, engagement stats, community reactions
- One-tap to play/listen
- Ability to comment, react, share outside Curio
- "Also shared by X curators" indicator when multiple curators share the same track

**Why it matters:** This is where holders spend time, discover new music, and feel part of their communities.

### 2. Discover
**What:** Find new curators and communities to join

**Features:**
- Browse by genre/vibe tags (house, techno, indie, hip-hop, ambient, etc.)
- Trending curators (based on recent coin purchases, engagement)
- Trending shares (what's getting traction across all communities)
- Sample shares from curators (preview before buying their coin)
- Curator profiles with track record and stats

**Discovery filters:**
- By genre/vibe
- By activity level (how often they share)
- By community size (coin holders)
- By coin price (accessibility)

**Why it matters:** This is where growth happens. Make it easy to find the right curator and users will buy coins.

### 3. Communities
**What:** Your music communities (the curator coins you hold)

**Features:**
- List of all curator coins you hold
- Each community shows:
  - Recent shares from that curator
  - Other members (fellow coin holders)
  - Community stats (total holders, activity level)
  - Upcoming events (if any)
- Ability to see what other community members are sharing/into
- Community-specific feed

**Why it matters:** Creates belonging and shows the value of holding coins beyond just music access.

### 4. Profile

**Curator Profile:**
- Curator name + Base identity
- Genres/vibes you curate
- Creator coin info (price, holders, how to buy)
- Curation stats (total shares, consistency, engagement)
- All your shares (public preview + full access for holders)
- Your communities (coins you also hold - shows your taste influences)

**Listener Profile:**
- Your music communities (coins you hold)
- Your activity (comments, shares you've engaged with)
- Your taste graph (what this reveals about your preferences)

**Why it matters:** Credibility for curators, identity for listeners.

## Key Features to Build

### Phase 1: Core Experience (Launch v2)

**Must Have:**
1. Base wallet connection + creator coin detection
2. Curator onboarding: set genres/vibes, link existing creator coin
3. Music share creation: paste link, add note, post
4. Track normalization: detect same songs across platforms (using Songlink/Odesli API)
5. **Taste overlap feature:**
   - Detect when curators share the same track
   - Notify curator: "X also shared this - you have similar taste!"
   - Show profile preview with option to view/follow
   - Display "also shared by" on feed posts for social proof
6. Token-gating logic: check if viewer holds curator's coin
7. Home feed: shows shares from coins you hold
8. Discover: browse curators by genre
9. Basic curator profile with stats
10. Sample shares (preview 2-3 recent shares before buying coin)

**Technical Requirements:**
- Integrate with Base for wallet/coin data
- Music link parsing + normalization (Songlink/Odesli API)
- Universal track ID system for duplicate detection
- Token-gating middleware
- Basic engagement tracking (views, plays, reactions)

### Phase 2: Community & Growth (Post-Launch)

1. Social features within communities
2. Cross-community discovery (see what others in your communities like)
3. Curator reputation scoring
4. Advanced taste-matching algorithm using overlap data
5. Notifications (new shares from your communities, taste matches)
6. Community chat/spaces for holders
7. Event coordination tools for IRL meetups
8. Taste graph visualization ("curators in your orbit")
9. Collaborative playlists/channels for curators with high overlap

### Phase 3: Scale & Intelligence (Future)

1. AI agents for cross-platform distribution
2. Taste clustering and recommendations
3. Automated community formation
4. Analytics for curators (who they overlap with, growth metrics)
5. Integration with more Base social primitives
6. Festival/event ticketing for communities

## The Taste Overlap System

**How It Works:**

When a curator shares a track:
1. System checks universal track ID against existing shares
2. If match found, trigger taste overlap flow
3. Notify curator with profile preview of other curator(s)
4. Mark share with "also loved by X" badge
5. Track overlap data for future recommendations

**Benefits:**
- **Discovery:** Curators find peers naturally through shared taste
- **Social proof:** "Multiple curators you follow love this" validates quality
- **Network effects:** Creates web of connections between communities
- **Collaboration:** Foundation for future collaborative features
- **Recommendation:** Data powers "you might also like" suggestions

**Data to Track:**
- Track overlap percentage between any two curators
- Most co-shared tracks across the platform
- Taste clusters (which curators consistently share similar music)
- Bridge curators (connect different taste communities)

## Success Metrics

### North Star
**Number of active curator communities** (curators with >20 coin holders who consistently share music)

### Key Metrics
- Curators earning >$100/month from coin sales
- Listener retention (weekly active holders)
- Shares per curator per week
- Coin purchases driven by music discovery
- Community engagement rate
- Taste overlap connections made (curator-to-curator follows driven by shared tracks)

### Early Validation (First 3 Months)
- 10 curators actively sharing weekly
- 200 listeners holding at least one curator coin
- 50+ music shares per week
- At least 3 curators earning $50+/month
- 20+ curator connections made through taste overlap

## Go-To-Market

### Phase 1: Seed Community (Weeks 1-4)
1. Identify 5-10 music curators already active on Farcaster/Base
2. Personal outreach - give them early access
3. Help them set up profiles and make first shares
4. Seed their communities with 10-20 holders each
5. Gather feedback and iterate rapidly

### Phase 2: Expand (Weeks 5-12)
1. Launch publicly on Farcaster
2. Curator-led growth: successful curators bring their audiences
3. Build showcase of successful communities
4. Create content around curator success stories
5. Host first IRL meetup/listening party for one community

### Phase 3: Scale (Month 4+)
1. Open to curators beyond Farcaster
2. Enable cross-platform distribution
3. AI agents help form and connect communities
4. Festival/event partnerships

## Design Principles

### For Curators
- Make sharing effortless (one-tap flow)
- Show credibility building in real-time
- Celebrate milestones (first 10 holders, first $100 earned)
- Give tools to engage with community
- Surface taste connections ("You and X share 40% of tracks!")

### For Listeners
- Make discovery delightful (beautiful, music-first UI)
- Show clear value before asking to buy coins
- Create moments of connection (seeing fellow community members)
- Reduce friction to trying new curators
- Show social proof (multiple curators sharing same track)

### Overall
- Music-first aesthetic (album art prominent, clean typography)
- Fast, smooth interactions
- Clear social proof everywhere
- Celebrate the culture of music communities

## Risks & Mitigation

**Risk:** Curators already have coins but don't want to token-gate music
**Mitigation:** Make public sharing also valuable (discovery, reputation), premium content is optional

**Risk:** Not enough quality curators to start
**Mitigation:** Start hyper-focused on 1-2 genres, dominate those niches first

**Risk:** Listeners won't buy coins just for music access
**Mitigation:** Make the community aspect compelling, show what you get beyond just music

**Risk:** Too dependent on Base ecosystem health
**Mitigation:** Build product that works regardless, be ready to expand to other chains

**Risk:** Track normalization fails for obscure music
**Mitigation:** Graceful fallback to manual matching, allow curator override

## Next Steps

1. **Week 1-2:** Build core token-gating + feed infrastructure + track normalization
2. **Week 3:** Design and implement discovery flow + taste overlap system
3. **Week 4:** Curator onboarding + profile pages
4. **Week 5:** Private beta with 5 curators
5. **Week 6-8:** Iterate based on feedback, prepare for public launch
6. **Week 9:** Public launch on Farcaster

## Open Questions

1. Should curators be able to make some shares public (promotional) while keeping premium shares gated?
2. What's the minimum coin holding amount to access curator content? (Any amount vs. threshold)
3. How do we handle curators who don't have creator coins yet? Do we help them launch one?
4. Should listeners be able to tip on top of holding coins, or is the coin the only economic mechanism?
5. For taste overlap: Should we show percentage match publicly or keep it subtle?
6. Should curators be able to opt out of taste overlap notifications?

---

**The Big Bet:** Music curation is valuable enough that people will buy creator coins specifically to access it, and the community that forms around shared taste is sticky enough to keep them holding.
