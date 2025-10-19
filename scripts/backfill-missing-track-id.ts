/**
 * Backfill script for recommendations missing track_id
 *
 * This script finds recommendations without a track_id, creates proper track entries,
 * updates the recommendations with the track_id, and awards missing XP to curators.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fetchSonglinkData } from '../lib/songlink';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OldRecommendation {
  id: string;
  curator_fid: number;
  music_url: string;
  song_title: string;
  artist: string;
  artwork_url: string;
  platform: string;
  created_at: string;
  review: string;
  genre: string;
  moods: string[];
}

async function backfillMissingTrackIds() {
  console.log('🔍 Starting backfill for recommendations missing track_id...\n');

  // Step 1: Find all recommendations without track_id
  const { data: oldRecs, error: fetchError } = await supabase
    .from('recommendations')
    .select('*')
    .is('track_id', null);

  if (fetchError) {
    console.error('❌ Error fetching recommendations:', fetchError);
    return;
  }

  if (!oldRecs || oldRecs.length === 0) {
    console.log('✅ No recommendations missing track_id. All good!');
    return;
  }

  console.log(`📊 Found ${oldRecs.length} recommendation(s) without track_id\n`);

  for (const rec of oldRecs as OldRecommendation[]) {
    console.log(`\n--- Processing recommendation ${rec.id} ---`);
    console.log(`   Track: "${rec.song_title}" by ${rec.artist}`);
    console.log(`   Curator FID: ${rec.curator_fid}`);
    console.log(`   Created: ${new Date(rec.created_at).toLocaleDateString()}`);

    try {
      // Step 2: Try to fetch Songlink data for proper normalization
      let trackId: string;
      console.log('   Fetching Songlink data...');
      const songlinkData = await fetchSonglinkData(rec.music_url);

      if (songlinkData) {
        console.log(`   ✅ Songlink data found: "${songlinkData.title}" by ${songlinkData.artist}`);

        // Check if track already exists with this songlink_id
        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('id')
          .eq('songlink_id', songlinkData.songlinkId)
          .single();

        if (existingTrack) {
          console.log(`   ℹ️  Track already exists with ID: ${existingTrack.id}`);
          trackId = existingTrack.id;
        } else {
          // Create new track with Songlink data
          console.log('   Creating track entry with Songlink data...');
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
            console.error('   ❌ Error creating track:', trackError.message);
            continue;
          }

          trackId = newTrack.id;
          console.log(`   ✅ Track created with ID: ${trackId}`);
        }

        // Update recommendation with better metadata from Songlink
        await supabase
          .from('recommendations')
          .update({
            song_title: songlinkData.title,
            artist: songlinkData.artist,
            artwork_url: songlinkData.artworkUrl,
          })
          .eq('id', rec.id);

      } else {
        // Fallback: Create track without Songlink data
        console.log('   ⚠️  Songlink data not available, using existing metadata...');
        const { data: newTrack, error: trackError } = await supabase
          .from('tracks')
          .insert({
            songlink_id: rec.music_url, // Use URL as unique identifier
            title: rec.song_title,
            artist: rec.artist,
            album_artwork_url: rec.artwork_url,
            spotify_url: rec.platform === 'spotify' ? rec.music_url : null,
            apple_music_url: rec.platform === 'apple music' ? rec.music_url : null,
            youtube_url: rec.platform === 'youtube' ? rec.music_url : null,
            soundcloud_url: rec.platform === 'soundcloud' ? rec.music_url : null,
            youtube_music_url: null,
            tidal_url: null,
            songlink_page_url: null,
          })
          .select('id')
          .single();

        if (trackError) {
          console.error('   ❌ Error creating track:', trackError.message);
          continue;
        }

        trackId = newTrack.id;
        console.log(`   ✅ Track created with ID: ${trackId}`);
      }

      // Step 3: Update recommendation with track_id
      console.log('   Updating recommendation with track_id...');
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ track_id: trackId })
        .eq('id', rec.id);

      if (updateError) {
        console.error('   ❌ Error updating recommendation:', updateError.message);
        continue;
      }

      console.log('   ✅ Recommendation updated');

      // Step 4: Check if XP was already awarded
      const { data: existingXP } = await supabase
        .from('curator_activity')
        .select('id')
        .eq('recommendation_id', rec.id)
        .eq('activity_type', 'share')
        .single();

      if (existingXP) {
        console.log('   ℹ️  XP already awarded, skipping');
        continue;
      }

      // Step 5: Award missing XP
      console.log('   Awarding missing XP...');

      // Award 10 XP for sharing
      const { error: xpError } = await supabase.rpc('log_curator_activity', {
        p_curator_fid: rec.curator_fid,
        p_activity_type: 'share',
        p_xp_earned: 10,
        p_recommendation_id: rec.id,
        p_track_id: trackId,
        p_metadata: { backfilled: true, original_created_at: rec.created_at }
      });

      if (xpError) {
        console.error('   ❌ Error awarding XP:', xpError.message);
      } else {
        console.log('   ✅ Awarded 10 XP for sharing');
      }

      // Step 6: Check for taste overlap (other curators who shared this track)
      const { data: overlaps } = await supabase
        .from('recommendations')
        .select(`
          id,
          curator_fid,
          curator:users!curator_fid(farcaster_fid, username, farcaster_pfp_url)
        `)
        .eq('track_id', trackId)
        .neq('curator_fid', rec.curator_fid)
        .limit(10);

      if (overlaps && overlaps.length > 0) {
        console.log(`   🎯 Found ${overlaps.length} taste overlap(s)`);

        for (const overlap of overlaps) {
          const curator = Array.isArray(overlap.curator) ? overlap.curator[0] : overlap.curator;

          // Award 50 XP for taste overlap
          await supabase.rpc('log_curator_activity', {
            p_curator_fid: rec.curator_fid,
            p_activity_type: 'taste_overlap',
            p_xp_earned: 50,
            p_recommendation_id: rec.id,
            p_track_id: trackId,
            p_metadata: {
              backfilled: true,
              other_curator_fid: overlap.curator_fid,
              other_curator_username: curator?.username,
              other_curator_pfp: curator?.farcaster_pfp_url
            }
          });

          console.log(`   ✅ Awarded 50 XP for taste overlap with @${curator?.username}`);
        }
      }

      console.log(`   ✨ Backfill complete for recommendation ${rec.id}`);

    } catch (error) {
      console.error(`   ❌ Unexpected error processing ${rec.id}:`, error);
      continue;
    }
  }

  // Step 7: Summary
  console.log('\n\n📊 Backfill Summary:');

  const { count: remainingNull } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .is('track_id', null);

  const { count: totalRecs } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true });

  const { count: totalTracks } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total recommendations: ${totalRecs}`);
  console.log(`   Total tracks: ${totalTracks}`);
  console.log(`   Recommendations without track_id: ${remainingNull || 0}`);
  console.log(`   Backfilled: ${oldRecs.length - (remainingNull || 0)}`);

  console.log('\n✅ Backfill complete!');
}

backfillMissingTrackIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
