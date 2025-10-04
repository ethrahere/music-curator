# Curatoor UI/UX Transfer Guide

Use this guide when you want to carry the visual language and interaction patterns of Curatoor into another product (or a new surface of this one). It summarizes the essence of the experience today and gives you guardrails for remixing it without losing the brand voice.

## 1. Experience North Stars
- **Mood-first discovery.** Everything feels like a curated green room: lush gradients, soft lighting, and rounded geometry suggest calm, intentional listening. Recreate that ambience anywhere the experience travels.
- **Human curators, not algorithms.** Highlight the person behind each recommendation—avatars, usernames, short notes, and timestamps stay prominent.
- **Low-friction sharing.** Primary flows (paste URL → share → post) avoid decision fatigue. Maintain a single, progressive action path wherever you port the UX.
- **Playful credibility.** Buttons and tags are whimsical but still precise. Keep microcopy succinct and encouraging.

## 2. Visual System Snapshot
### Color & Surface Tokens
- Background: deep forest gradient (`#07110b → #0b1a12`). If you move to light mode, lean on desaturated mint tones instead of pure white.
- Panels: pastel-mint gradient card with dark green border (`--panel-gradient`, `--panel-border`). Keep 20+ px radii and inner highlight.
- Buttons: two families—`btn-pastel` (gradient, elevated primary) and `btn-ghost` (translucent secondary). Preserve drop shadows and subtle hover lift.
- Accents: neon-glow white/green (`--accent-neon`, `--accent-glow`) for key highlights, focus rings (#8fd8a7 alpha) for accessibility continuity.

### Typography
- Primary typeface: **DM Sans** (600–700 weight for headings/buttons, 400–500 for body). Maintain generous letter spacing on uppercase chips and CTAs.
- Hierarchy: H1 ≈ 2–2.25rem, body around 0.95–1rem, chip text ≤0.75rem uppercase.

### Layout
- Constrain content to 5xl center column (`max-w-5xl`) with soft gutters (`px-4`). Top nav floats in a translucent panel; cards stack with 20–24px spacing.
- Use `panel-surface` wrappers for any hero, modal, or card. The pseudo-element highlight is a big part of the brand feel—carry it over.

## 3. Interaction & Motion Principles
- **Ready states:** mark mini apps as ready immediately (`sdk.actions.ready`) to keep things snappy. Show optimistic feedback (toasts, inline text) within 300ms when actions succeed.
- **Primary flow:** inline forms have one CTA. Disable buttons only for hard validation failures; otherwise allow optimistic submit.
- **Micro-motions:** use `translateY(-1px)` hover lift, short ease transitions (`0.18s ease`). Resist adding large-scale animations that conflict with the calm vibe.
- **Feedback:** leverage soft, on-surface text for status (success muted, errors warm). Avoid heavy banners.

## 4. Core Components (Port These)
Component | Purpose | Key Traits | File Reference
---|---|---|---
`NavBar` | Wallet/Farcaster identity, entry to sharing | Gradient panel, centered logo, avatar button | `app/components/NavBar.tsx`
`RecommendationCard` | Main feed item | Edge-to-edge art, curator chip, tip/share actions | `app/components/RecommendationCard.tsx`
`PostRecommendationModal` | Capture flow | Full-width gradient modal, stacked fields, CTA row | `app/components/PostRecommendationModal.tsx`
`TipModal` & `UserProfileModal` | Secondary dialogs | Same modal styling, accent chips, responsive layout | `app/components/TipModal.tsx`, `app/components/UserProfileModal.tsx`

When recreating them, keep:
- Rounded corners ≥20px.
- Soft shadow + inner highlight combo.
- Input shells with inset glow and thick focus ring.
- Pill tags for metadata (genre, mood, tip counts).

## 5. Content & Tone
- Copy style is encouraging and informal (“Share to Warpcast”, “Why should people listen?”). Avoid jargon. If you expand to other surfaces, keep taglines short, music-emotive, and emoji-friendly.
- Use emojis sparingly but intentionally (🎵 for tracks, 💸 for tipping). They act as quick affordances.

## 6. Accessibility Guardrails
- Maintain ≥4.5:1 contrast on text sitting on gradients; darken border or lighten background if you remix colors.
- Ensure focus states remain highly visible: reuse `box-shadow: 0 0 0 4px var(--focus)`.
- Provide logical fallback copy when Farcaster identity is missing (e.g., display `fid:1234`).

## 7. Porting Checklist
1. **Define tokens first.** Recreate the CSS custom properties (`--panel-gradient`, `--button-gradient`, focus ring, etc.) in the new surface. This keeps colors and lighting consistent.
2. **Adopt the layout skeleton.** Carry over the centered column, sticky nav, and panel spacing. On mobile, allow panels to go full-width with 16px gutters.
3. **Mirror component structure.** Port the atomic pieces (`panel-surface`, `btn-*`, `pill-tag`, `input-shell`) before rewriting more complex views.
4. **Reapply interaction hooks.** If you’re reusing the Mini App flow, call `sdk.actions.ready()` and `sdk.actions.composeCast()` at equivalent points to maintain perceived speed.
5. **Validate copy + emojis.** Double-check CTA text still makes sense in the new context; keep the same warmth.
6. **Run dark/light QA.** Background gradients and focus halos should be tested in both modes if the destination surface supports them.

## 8. Extending the System
- **Alternate themes:** shift the base gradient hue (e.g., violet or amber) but keep the dual-gradient panel + dark border formula.
- **Additional actions:** Introduce new buttons by using the two-button stack pattern (primary gradient, secondary ghost). Limit to two visible CTAs per card.
- **Different content types:** For podcasts or play lists, swap the art ratio but keep the same card framing, chip usage, and curator emphasis.

## 9. Asset Inventory
- Logo: `public/curio.png`
- Icon: `public/curio-logo.png`
- Default image: `public/image-url.png`

Reuse or recolor them rather than replacing with generic assets to maintain brand recognition.

## 10. When Not to Port Directly
- Data-dense dashboards or enterprise settings that require tables/charts: the whimsical gradients can obscure readability. Flatten the background and increase contrast if so.
- High-latency flows where immediate feedback isn’t possible: the optimistic patterns may mislead users; add explicit spinners or progress meters.

Keep this guide close when you explore new platforms (web, native mini app, marketing site). Preserve the core feelings—calm, curated, human—while adapting layout and copy to the new surface.
