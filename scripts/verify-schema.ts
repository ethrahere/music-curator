/**
 * Verify that the tracks and recommendations tables are properly connected
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  // Check tracks table
  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select('*')
    .limit(5);

  if (tracksError) {
    console.error('❌ Error querying tracks table:', tracksError);
    return;
  }

  console.log(`✅ Tracks table: ${tracks?.length || 0} tracks found`);
  if (tracks && tracks.length > 0) {
    console.log('   Sample track:', {
      id: tracks[0].id,
      title: tracks[0].title,
      artist: tracks[0].artist,
      songlink_id: tracks[0].songlink_id,
      platforms: {
        spotify: !!tracks[0].spotify_url,
        appleMusic: !!tracks[0].apple_music_url,
        youtube: !!tracks[0].youtube_url,
        soundcloud: !!tracks[0].soundcloud_url,
      }
    });
  }

  console.log('');

  // Check recommendations table with track join
  const { data: recommendations, error: recsError } = await supabase
    .from('recommendations')
    .select(`
      id,
      track_id,
      original_url,
      curator_note,
      curator_fid,
      track:tracks (
        id,
        title,
        artist,
        songlink_id
      )
    `)
    .not('track_id', 'is', null)
    .limit(5);

  if (recsError) {
    console.error('❌ Error querying recommendations with track join:', recsError);
    return;
  }

  console.log(`✅ Recommendations with track_id: ${recommendations?.length || 0} found`);
  if (recommendations && recommendations.length > 0) {
    const sampleRecommendation = recommendations[0];
    const trackData = sampleRecommendation.track as any;
    const sampleTrack = Array.isArray(trackData)
      ? trackData[0]
      : trackData;

    console.log('   Sample recommendation:', {
      id: sampleRecommendation.id,
      curator_fid: sampleRecommendation.curator_fid,
      original_url: (sampleRecommendation.original_url as string)?.substring(0, 50) + '...',
      track_linked: !!sampleTrack,
      track_title: sampleTrack?.title,
    });
  }

  console.log('');

  // Check for recommendations without track_id (old schema)
  const { count: oldRecsCount } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .is('track_id', null);

  console.log(`ℹ️  Recommendations without track_id (old schema): ${oldRecsCount || 0}`);

  // Check total counts
  const { count: totalTracks } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true });

  const { count: totalRecs } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true });

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total tracks: ${totalTracks || 0}`);
  console.log(`   Total recommendations: ${totalRecs || 0}`);
  console.log(`   Ratio: ${totalRecs && totalTracks ? (totalRecs / totalTracks).toFixed(2) : 0} recommendations per track`);

  // Manual query for tracks with multiple recommendations
  const { data: popularTracksData, error: popularTracksError } = await supabase
    .from('recommendations')
    .select('track_id, track:tracks(title, artist)')
    .not('track_id', 'is', null);

  if (popularTracksError) {
    console.error('❌ Error querying popular tracks:', popularTracksError);
    return;
  }

  type PopularTrack = {
    track_id: string | null;
    track: {
      title: string | null;
      artist: string | null;
    } | null;
  };

  const popularTracks: PopularTrack[] = (popularTracksData as unknown as PopularTrack[]) ?? [];

  if (popularTracks.length > 0) {
    const trackCounts = popularTracks.reduce<Record<string, number>>((acc, rec) => {
      if (rec.track_id) {
        acc[rec.track_id] = (acc[rec.track_id] || 0) + 1;
      }
      return acc;
    }, {});

    const multipleRecs = Object.entries(trackCounts)
      .map(([trackId, count]) => ({ trackId, count }))
      .filter(({ count }) => count > 1)
      .sort((a, b) => b.count - a.count);

    if (multipleRecs.length > 0) {
      console.log('');
      console.log('🎯 Taste Overlap Detected:');
      console.log(`   ${multipleRecs.length} tracks have multiple curators!`);

      const topTrackId = multipleRecs[0].trackId;
      const topTrack = popularTracks.find(r => r.track_id === topTrackId);
      if (topTrack?.track) {
        console.log(`   Top: "${topTrack.track.title}" by ${topTrack.track.artist} (${multipleRecs[0].count} curators)`);
      }
    }
  }

  console.log('');
  console.log('✅ Schema verification complete!');
}

verifySchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
