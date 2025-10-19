/**
 * Backfill XP for existing users who have already shared tracks
 * Awards 10 XP per share + 50 XP per taste overlap
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RecommendationRow = {
  id: string;
  curator_fid: number;
  track_id: string;
  created_at: string;
};

async function backfillXP() {
  console.log('🔄 Starting XP backfill for existing users...\n');

  // Step 1: Get all recommendations with track_id
  const { data: recommendationRows, error: recError } = await supabase
    .from('recommendations')
    .select('id, curator_fid, track_id, created_at')
    .not('track_id', 'is', null)
    .order('created_at', { ascending: true });

  if (recError) {
    console.error('❌ Error fetching recommendations:', recError);
    return;
  }

  if (!recommendationRows || recommendationRows.length === 0) {
    console.log('ℹ️  No recommendations found to backfill');
    return;
  }

  const recommendations: RecommendationRow[] = recommendationRows;

  console.log(`📊 Found ${recommendations.length} recommendations to process\n`);

  let totalActivitiesCreated = 0;
  const curatorXP: Record<number, number> = {};

  // Group recommendations by track_id to detect taste overlap
  const trackMap: Record<string, RecommendationRow[]> = {};
  for (const rec of recommendations) {
    if (!trackMap[rec.track_id]) {
      trackMap[rec.track_id] = [];
    }
    trackMap[rec.track_id].push(rec);
  }

  // Step 2: Process each recommendation chronologically
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    console.log(`[${i + 1}/${recommendations.length}] Processing recommendation ${rec.id.substring(0, 8)}...`);

    // Award 10 XP for sharing
    const { data: shareActivity, error: shareError } = await supabase.rpc('log_curator_activity', {
      p_curator_fid: rec.curator_fid,
      p_activity_type: 'share',
      p_xp_earned: 10,
      p_recommendation_id: rec.id,
      p_track_id: rec.track_id,
      p_metadata: null
    });

    if (shareError) {
      console.log(`  ⚠️  Failed to log share activity:`, shareError.message);
    } else {
      console.log(`  ✅ +10 XP for share`);
      totalActivitiesCreated++;
      curatorXP[rec.curator_fid] = (curatorXP[rec.curator_fid] || 0) + 10;
    }

    // Check for taste overlap (recommendations before this one with same track_id)
    const trackRecs = trackMap[rec.track_id];
    const priorRecs = trackRecs.filter(r =>
      r.id !== rec.id &&
      r.curator_fid !== rec.curator_fid &&
      new Date(r.created_at) < new Date(rec.created_at)
    );

    if (priorRecs.length > 0) {
      console.log(`  💫 Found ${priorRecs.length} prior curator(s) who shared this track`);

      for (const priorRec of priorRecs) {
        // Get curator info
        const { data: priorCurator } = await supabase
          .from('users')
          .select('username, farcaster_pfp_url')
          .eq('farcaster_fid', priorRec.curator_fid)
          .single();

        const { data: overlapActivity, error: overlapError } = await supabase.rpc('log_curator_activity', {
          p_curator_fid: rec.curator_fid,
          p_activity_type: 'taste_overlap',
          p_xp_earned: 50,
          p_recommendation_id: rec.id,
          p_track_id: rec.track_id,
          p_metadata: {
            other_curator_fid: priorRec.curator_fid,
            other_curator_username: priorCurator?.username,
            other_curator_pfp: priorCurator?.farcaster_pfp_url
          }
        });

        if (overlapError) {
          console.log(`    ⚠️  Failed to log taste overlap:`, overlapError.message);
        } else {
          console.log(`    ✅ +50 XP for taste overlap with @${priorCurator?.username || 'unknown'}`);
          totalActivitiesCreated++;
          curatorXP[rec.curator_fid] = (curatorXP[rec.curator_fid] || 0) + 50;
        }
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total activities created: ${totalActivitiesCreated}`);
  console.log(`👥 Curators with XP: ${Object.keys(curatorXP).length}`);
  console.log('\n🏆 Top 10 XP earners:');

  const topCurators = Object.entries(curatorXP)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  for (const [fid, xp] of topCurators) {
    const { data: curator } = await supabase
      .from('users')
      .select('username')
      .eq('farcaster_fid', parseInt(fid))
      .single();

    console.log(`  ${curator?.username || `FID ${fid}`}: ${xp} XP`);
  }

  console.log('='.repeat(60) + '\n');
  console.log('✅ Backfill complete!');
}

backfillXP()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
