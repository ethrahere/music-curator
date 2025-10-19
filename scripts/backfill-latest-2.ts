/**
 * Backfill the 2 latest recommendations without track_id
 */

import { createClient } from '@supabase/supabase-js';
import { fetchSonglinkData } from '../lib/songlink';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfillLatest2() {
  console.log('[BACKFILL] Fetching 2 latest recommendations without track_id...\n');

  // Get 2 latest recommendations without track_id
  const { data: recommendations, error } = await supabase
    .from('recommendations')
    .select('id, music_url, song_title, artist, artwork_url, platform, created_at')
    .is('track_id', null)
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('[BACKFILL] Error:', error);
    return;
  }

  if (!recommendations || recommendations.length === 0) {
    console.log('[BACKFILL] No recommendations found without track_id!');
    return;
  }

  console.log(`[BACKFILL] Found ${recommendations.length} recommendations to backfill\n`);

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    console.log(`[${i + 1}/${recommendations.length}] Processing: ${rec.song_title} - ${rec.artist}`);
    console.log(`   Created: ${rec.created_at}`);
    console.log(`   URL: ${rec.music_url}`);

    if (!rec.music_url) {
      console.log(`   ⏭️  Skipped: No music URL\n`);
      continue;
    }

    try {
      // Call Songlink API
      console.log(`   🔍 Calling Songlink API...`);
      const songlinkData = await fetchSonglinkData(rec.music_url);

      if (!songlinkData) {
        console.log(`   ⚠️  Songlink API failed, using fallback data`);

        // Fallback: Create track using existing data
        const { data: fallbackTrack, error: fallbackError } = await supabase
          .from('tracks')
          .upsert({
            songlink_id: `FALLBACK::${rec.music_url}`,
            title: rec.song_title,
            artist: rec.artist,
            album_artwork_url: rec.artwork_url,
          }, {
            onConflict: 'songlink_id',
            ignoreDuplicates: false
          })
          .select('id')
          .single();

        if (fallbackError) {
          console.log(`   ❌ Failed:`, fallbackError.message);
          continue;
        }

        // Update recommendation with track_id
        const { error: updateError } = await supabase
          .from('recommendations')
          .update({ track_id: fallbackTrack.id })
          .eq('id', rec.id);

        if (updateError) {
          console.log(`   ❌ Failed to update recommendation:`, updateError.message);
          continue;
        }

        console.log(`   ✅ Created fallback track (ID: ${fallbackTrack.id})\n`);
        continue;
      }

      console.log(`   📌 Songlink ID: ${songlinkData.songlinkId}`);
      console.log(`   📝 Title: ${songlinkData.title}`);
      console.log(`   🎤 Artist: ${songlinkData.artist}`);

      // Check if track exists
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('id')
        .eq('songlink_id', songlinkData.songlinkId)
        .single();

      let trackId: string;

      if (existingTrack) {
        console.log(`   📌 Track already exists (ID: ${existingTrack.id})`);
        trackId = existingTrack.id;
      } else {
        console.log(`   ➕ Creating new track entry...`);
        const { data: newTrack, error: trackError } = await supabase
          .from('tracks')
          .insert({
            songlink_id: songlinkData.songlinkId,
            title: songlinkData.title,
            artist: songlinkData.artist,
            album_artwork_url: songlinkData.artworkUrl,
            spotify_url: songlinkData.spotifyUrl,
            apple_music_url: songlinkData.appleMusicUrl,
            youtube_url: songlinkData.youtubeUrl,
            soundcloud_url: songlinkData.soundcloudUrl,
            youtube_music_url: songlinkData.youtubeMusicUrl,
            tidal_url: songlinkData.tidalUrl,
            songlink_page_url: songlinkData.songlinkPageUrl,
          })
          .select('id')
          .single();

        if (trackError) {
          console.log(`   ❌ Failed:`, trackError.message);
          continue;
        }

        trackId = newTrack.id;
        console.log(`   ✅ Track created (ID: ${trackId})`);
      }

      // Update recommendation with track_id
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ track_id: trackId })
        .eq('id', rec.id);

      if (updateError) {
        console.log(`   ❌ Failed to update recommendation:`, updateError.message);
        continue;
      }

      console.log(`   ✅ Recommendation linked to track!\n`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`   ❌ Error:`, error);
    }
  }

  console.log('✅ Backfill complete!');
}

backfillLatest2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
