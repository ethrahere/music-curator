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
    console.log('   Sample recommendation:', {
      id: recommendations[0].id,
      curator_fid: recommendations[0].curator_fid,
      original_url: recommendations[0].original_url?.substring(0, 50) + '...',
      track_linked: !!recommendations[0].track,
      track_title: recommendations[0].track?.title,
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

  // Check for duplicate tracks (taste overlap)
  const { data: duplicates } = await supabase.rpc('get_track_recommendation_counts' as any, {}).limit(10);

  // Manual query for tracks with multiple recommendations
  const { data: popularTracks } = await supabase
    .from('recommendations')
    .select('track_id, track:tracks(title, artist)')
    .not('track_id', 'is', null);

  if (popularTracks) {
    const trackCounts = popularTracks.reduce((acc: any, rec: any) => {
      if (rec.track_id) {
        acc[rec.track_id] = (acc[rec.track_id] || 0) + 1;
      }
      return acc;
    }, {});

    const multipleRecs = Object.entries(trackCounts)
      .filter(([_, count]) => (count as number) > 1)
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    if (multipleRecs.length > 0) {
      console.log('');
      console.log('🎯 Taste Overlap Detected:');
      console.log(`   ${multipleRecs.length} tracks have multiple curators!`);

      const topTrackId = multipleRecs[0][0];
      const topTrack = popularTracks.find(r => r.track_id === topTrackId);
      if (topTrack?.track) {
        console.log(`   Top: "${topTrack.track.title}" by ${topTrack.track.artist} (${multipleRecs[0][1]} curators)`);
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
