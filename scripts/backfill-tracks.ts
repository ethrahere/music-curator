/**
 * Backfill script to migrate existing recommendations to new tracks schema
 *
 * This script:
 * 1. Fetches all existing recommendations that don't have a track_id
 * 2. For each recommendation, calls Songlink API to normalize the track
 * 3. Creates or finds canonical track in tracks table
 * 4. Updates recommendation to link to the track
 */

import { createClient } from '@supabase/supabase-js';
import { fetchSonglinkData } from '../lib/songlink';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface OldRecommendation {
  id: string;
  music_url: string;
  song_title: string;
  artist: string;
  artwork_url: string;
  platform: string;
}

async function backfillTracks() {
  console.log('[BACKFILL] Starting tracks backfill...\n');

  // Step 1: Get all recommendations without track_id
  const { data: recommendations, error } = await supabase
    .from('recommendations')
    .select('id, music_url, song_title, artist, artwork_url, platform')
    .is('track_id', null);

  if (error) {
    console.error('[BACKFILL] Error fetching recommendations:', error);
    return;
  }

  if (!recommendations || recommendations.length === 0) {
    console.log('[BACKFILL] No recommendations to backfill!');
    return;
  }

  console.log(`[BACKFILL] Found ${recommendations.length} recommendations to process\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  // Step 2: Process each recommendation
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i] as OldRecommendation;
    console.log(`[${i + 1}/${recommendations.length}] Processing: ${rec.song_title} - ${rec.artist}`);

    if (!rec.music_url) {
      console.log(`  ⏭️  Skipped: No music URL`);
      skippedCount++;
      continue;
    }

    try {
      // Step 3: Call Songlink API
      console.log(`  🔍 Calling Songlink API for: ${rec.music_url}`);
      const songlinkData = await fetchSonglinkData(rec.music_url);

      if (!songlinkData) {
        console.log(`  ⚠️  Songlink API failed, using fallback data`);

        // Fallback: Create track using existing data
        const { data: fallbackTrack, error: fallbackError } = await supabase
          .from('tracks')
          .upsert({
            songlink_id: `FALLBACK::${rec.music_url}`, // Use URL as unique identifier
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
          console.log(`  ❌ Failed to create fallback track:`, fallbackError.message);
          failCount++;
          continue;
        }

        // Update recommendation with track_id
        const { error: updateError } = await supabase
          .from('recommendations')
          .update({
            track_id: fallbackTrack.id,
          })
          .eq('id', rec.id);

        if (updateError) {
          console.log(`  ❌ Failed to update recommendation:`, updateError.message);
          failCount++;
          continue;
        }

        console.log(`  ✅ Created fallback track and linked recommendation`);
        successCount++;
        continue;
      }

      // Step 4: Check if track exists, create if not
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('id')
        .eq('songlink_id', songlinkData.songlinkId)
        .single();

      let trackId: string;

      if (existingTrack) {
        console.log(`  📌 Track already exists (ID: ${existingTrack.id})`);
        trackId = existingTrack.id;
      } else {
        console.log(`  ➕ Creating new track entry`);
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
          console.log(`  ❌ Failed to create track:`, trackError.message);
          failCount++;
          continue;
        }

        trackId = newTrack.id;
      }

      // Step 5: Update recommendation with track_id
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({
          track_id: trackId,
        })
        .eq('id', rec.id);

      if (updateError) {
        console.log(`  ❌ Failed to update recommendation:`, updateError.message);
        failCount++;
        continue;
      }

      console.log(`  ✅ Successfully linked recommendation to track`);
      successCount++;

      // Rate limiting: wait 500ms between requests to avoid hitting Songlink API limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`  ❌ Error:`, error);
      failCount++;
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('[BACKFILL] SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📊 Total: ${recommendations.length}`);
  console.log('='.repeat(60) + '\n');
}

// Run the backfill
backfillTracks()
  .then(() => {
    console.log('[BACKFILL] Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[BACKFILL] Fatal error:', error);
    process.exit(1);
  });
