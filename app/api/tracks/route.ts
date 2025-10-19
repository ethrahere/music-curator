import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '@/types/music';
import { DEFAULT_ARTWORK_URL } from '@/lib/constants';
import { fetchSonglinkData, detectPlatform } from '@/lib/songlink';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get('sort') || 'recent';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const genre = searchParams.get('genre');

  try {
    let query = supabase
      .from('recommendations')
      .select(`
        *,
        curator:users!curator_fid(farcaster_fid, username, curator_score, wallet_address, farcaster_pfp_url),
        track:tracks!track_id(*)
      `);

    // Apply genre filter if provided
    if (genre) {
      query = query.eq('genre', genre);
    }

    // Apply sorting
    if (sort === 'most_tipped') {
      query = query.order('total_tips_usd', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ tracks: [] });
    }

    // Get co-sign counts for all tracks
    const trackIds = data?.map(rec => rec.id) || [];
    const { data: coSignData } = await supabase
      .from('co_signs')
      .select('recommendation_id')
      .in('recommendation_id', trackIds);

    // Count co-signs per track
    const coSignCounts = (coSignData || []).reduce((acc, cs) => {
      acc[cs.recommendation_id] = (acc[cs.recommendation_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform DB records to MusicTrack format
    const tracks: MusicTrack[] = (data || []).map((rec) => {
      // Use track data if available (new schema), fallback to old schema
      const trackData = rec.track || {};

      return {
        id: rec.id,
        url: rec.music_url, // Original URL curator pasted
        platform: rec.platform || detectPlatform(rec.music_url),
        title: trackData.title || rec.song_title,
        artist: trackData.artist || rec.artist,
        artwork: trackData.album_artwork_url || rec.artwork_url || DEFAULT_ARTWORK_URL,
        embedUrl: rec.embed_url || '',
        tips: rec.total_tips_usd || 0,
        coSigns: coSignCounts[rec.id] || 0,
        sharedBy: {
          fid: rec.curator?.farcaster_fid || 0,
          username: rec.curator?.username || 'unknown',
          curatorScore: rec.curator?.curator_score || 0,
          walletAddress: rec.curator?.wallet_address || undefined,
          pfpUrl: rec.curator?.farcaster_pfp_url || undefined,
        },
        timestamp: new Date(rec.created_at).getTime(),
        review: rec.review || undefined,
        // Store platform links for UI
        platformLinks: trackData.songlink_id ? {
          spotify: trackData.spotify_url,
          appleMusic: trackData.apple_music_url,
          youtube: trackData.youtube_url,
          soundcloud: trackData.soundcloud_url,
          youtubeMusic: trackData.youtube_music_url,
          tidal: trackData.tidal_url,
          songlink: trackData.songlink_page_url,
        } : undefined,
      };
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json({ tracks: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const track: MusicTrack = body;
    const curatorFid = track.sharedBy.fid;
    const curatorUsername = track.sharedBy.username || 'anonymous';
    const curatorPfpUrl = track.sharedBy.pfpUrl;
    const curatorWalletAddress = track.sharedBy.walletAddress;

    console.log('[TRACK SUBMISSION] Received track data:', {
      url: track.url,
      review: body.review,
      genre: body.genre,
      moods: body.moods,
      curatorFid,
    });

    // Step 1: Fetch Songlink data to normalize the track
    console.log('[TRACK SUBMISSION] Calling Songlink API...');
    const songlinkData = await fetchSonglinkData(track.url);

    if (!songlinkData) {
      console.error('[TRACK SUBMISSION] Songlink API failed, falling back to manual entry');
      // Fall back to manual track entry if Songlink fails
      // This maintains backward compatibility
    }

    // Ensure user exists in users table (upsert) - store wallet address for tipping
    await supabase
      .from('users')
      .upsert({
        farcaster_fid: curatorFid,
        username: curatorUsername,
        farcaster_pfp_url: curatorPfpUrl,
        wallet_address: curatorWalletAddress,
      }, {
        onConflict: 'farcaster_fid',
        ignoreDuplicates: false
      });

    let trackId: string;

    if (songlinkData) {
      console.log('[TRACK SUBMISSION] Songlink data received:', {
        songlinkId: songlinkData.songlinkId,
        title: songlinkData.title,
        artist: songlinkData.artist,
      });

      // Step 2: Check if track already exists in tracks table (cache lookup)
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('id')
        .eq('songlink_id', songlinkData.songlinkId)
        .single();

      if (existingTrack) {
        console.log('[TRACK SUBMISSION] Track already exists, using existing ID:', existingTrack.id);
        trackId = existingTrack.id;
      } else {
        // Step 3: Create new track entry
        console.log('[TRACK SUBMISSION] Creating new track entry...');
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
          console.error('[TRACK SUBMISSION] Error creating track:', trackError);
          return NextResponse.json({ success: false, error: 'Failed to create track' }, { status: 500 });
        }

        trackId = newTrack.id;
        console.log('[TRACK SUBMISSION] New track created with ID:', trackId);
      }

      // Step 4: Check for taste overlap (other curators who shared this track)
      console.log('[TRACK SUBMISSION] Checking for taste overlap...');
      const { data: existingRecs, error: overlapError } = await supabase
        .from('recommendations')
        .select(`
          id,
          curator_fid,
          curator:users!curator_fid(farcaster_fid, username, farcaster_pfp_url)
        `)
        .eq('track_id', trackId)
        .neq('curator_fid', curatorFid)
        .limit(10);

      type TasteOverlapRecord = {
        id: string;
        curator_fid: number;
        curator: {
          farcaster_fid: number;
          username: string | null;
          farcaster_pfp_url: string | null;
        } | null;
      };

      const tasteOverlapCurators: TasteOverlapRecord[] = (existingRecs || []).map((rec) => {
        const curator = Array.isArray(rec.curator) ? rec.curator[0] : rec.curator;
        return {
          id: rec.id,
          curator_fid: rec.curator_fid,
          curator: curator
            ? {
                farcaster_fid: curator.farcaster_fid,
                username: curator.username ?? null,
                farcaster_pfp_url: curator.farcaster_pfp_url ?? null,
              }
            : null,
        };
      });
      console.log(`[TRACK SUBMISSION] Found ${tasteOverlapCurators.length} other curator(s) who shared this track`);

      // Step 5: Create recommendation linking curator to track
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .insert({
          track_id: trackId,
          curator_fid: curatorFid,
          music_url: track.url, // Original URL curator pasted
          song_title: songlinkData.title, // Copy from Songlink for backward compatibility
          artist: songlinkData.artist, // Copy from Songlink for backward compatibility
          artwork_url: songlinkData.artworkUrl, // Copy from Songlink for backward compatibility
          review: body.review || '', // Curator's review/comment
          genre: body.genre || 'general',
          moods: body.moods || [],
          tip_count: 0,
          total_tips_usd: 0,
          is_public: true,
          platform: detectPlatform(track.url),
          embed_url: track.embedUrl || '',
        })
        .select()
        .single();

      if (recError) {
        console.error('[TRACK SUBMISSION] Error creating recommendation:', recError);
        return NextResponse.json({ success: false, error: recError.message }, { status: 400 });
      }

      // Step 6: Award XP for sharing
      console.log('[TRACK SUBMISSION] Awarding XP...');
      let totalXpEarned = 0;
      const xpActivities = [];

      // Award 10 XP for sharing
      const { data: shareActivity } = await supabase.rpc('log_curator_activity', {
        p_curator_fid: curatorFid,
        p_activity_type: 'share',
        p_xp_earned: 10,
        p_recommendation_id: recommendation.id,
        p_track_id: trackId,
        p_metadata: null
      });
      totalXpEarned += 10;
      xpActivities.push({ type: 'share', xp: 10 });
      console.log('[TRACK SUBMISSION] +10 XP for sharing');

      // Award 50 XP per taste overlap curator
      if (tasteOverlapCurators.length > 0) {
        for (const otherRec of tasteOverlapCurators) {
          const { data: overlapActivity } = await supabase.rpc('log_curator_activity', {
            p_curator_fid: curatorFid,
            p_activity_type: 'taste_overlap',
            p_xp_earned: 50,
            p_recommendation_id: recommendation.id,
            p_track_id: trackId,
            p_metadata: {
              other_curator_fid: otherRec.curator_fid,
              other_curator_username: otherRec.curator?.username,
              other_curator_pfp: otherRec.curator?.farcaster_pfp_url
            }
          });
          totalXpEarned += 50;
          xpActivities.push({
            type: 'taste_overlap',
            xp: 50,
            curator: {
              fid: otherRec.curator_fid,
              username: otherRec.curator?.username,
              pfpUrl: otherRec.curator?.farcaster_pfp_url
            }
          });
          console.log(`[TRACK SUBMISSION] +50 XP for taste overlap with @${otherRec.curator?.username}`);
        }
      }

      // Get updated user XP total
      const { data: userData } = await supabase
        .from('users')
        .select('xp')
        .eq('farcaster_fid', curatorFid)
        .single();

      console.log(`[TRACK SUBMISSION] Total XP earned: ${totalXpEarned}, User total: ${userData?.xp || 0}`);

      // Return track with DB-generated ID and Songlink data
      const savedTrack: MusicTrack = {
        id: recommendation.id,
        url: track.url,
        platform: detectPlatform(track.url),
        title: songlinkData.title,
        artist: songlinkData.artist,
        artwork: songlinkData.artworkUrl,
        embedUrl: track.embedUrl || '',
        tips: 0,
        sharedBy: track.sharedBy,
        timestamp: new Date(recommendation.created_at).getTime(),
        review: body.review,
        platformLinks: {
          spotify: songlinkData.spotifyUrl,
          appleMusic: songlinkData.appleMusicUrl,
          youtube: songlinkData.youtubeUrl,
          soundcloud: songlinkData.soundcloudUrl,
          youtubeMusic: songlinkData.youtubeMusicUrl,
          tidal: songlinkData.tidalUrl,
          songlink: songlinkData.songlinkPageUrl,
        },
      };

      console.log('[TRACK SUBMISSION] Successfully saved track and recommendation');
      return NextResponse.json({
        success: true,
        track: savedTrack,
        xp: {
          earned: totalXpEarned,
          total: userData?.xp || 0,
          activities: xpActivities
        }
      });

    } else {
      // Fallback: Create track entry manually if Songlink fails
      console.log('[TRACK SUBMISSION] Using fallback - creating track from provided metadata');

      // Step 1: Create track entry with available metadata
      const { data: newTrack, error: trackError } = await supabase
        .from('tracks')
        .insert({
          songlink_id: null, // No Songlink normalization available
          title: track.title,
          artist: track.artist,
          album_artwork_url: track.artwork,
          // Store the original URL in the appropriate platform field
          spotify_url: track.platform === 'spotify' ? track.url : null,
          apple_music_url: track.platform === 'apple music' ? track.url : null,
          youtube_url: track.platform === 'youtube' ? track.url : null,
          soundcloud_url: track.platform === 'soundcloud' ? track.url : null,
          youtube_music_url: null,
          tidal_url: null,
          songlink_page_url: null,
        })
        .select('id')
        .single();

      if (trackError) {
        console.error('[TRACK SUBMISSION] Fallback - Error creating track:', trackError);
        return NextResponse.json({ success: false, error: 'Failed to create track' }, { status: 500 });
      }

      trackId = newTrack.id;
      console.log('[TRACK SUBMISSION] Fallback - Track created with ID:', trackId);

      // Step 2: Check for taste overlap (same as normal flow)
      console.log('[TRACK SUBMISSION] Fallback - Checking for taste overlap...');
      const { data: existingRecs } = await supabase
        .from('recommendations')
        .select(`
          id,
          curator_fid,
          curator:users!curator_fid(farcaster_fid, username, farcaster_pfp_url)
        `)
        .eq('track_id', trackId)
        .neq('curator_fid', curatorFid)
        .limit(10);

      type TasteOverlapRecord = {
        id: string;
        curator_fid: number;
        curator: {
          farcaster_fid: number;
          username: string | null;
          farcaster_pfp_url: string | null;
        } | null;
      };

      const tasteOverlapCurators: TasteOverlapRecord[] = (existingRecs || []).map((rec) => {
        const curator = Array.isArray(rec.curator) ? rec.curator[0] : rec.curator;
        return {
          id: rec.id,
          curator_fid: rec.curator_fid,
          curator: curator
            ? {
                farcaster_fid: curator.farcaster_fid,
                username: curator.username ?? null,
                farcaster_pfp_url: curator.farcaster_pfp_url ?? null,
              }
            : null,
        };
      });
      console.log(`[TRACK SUBMISSION] Fallback - Found ${tasteOverlapCurators.length} other curator(s) who shared this track`);

      // Step 3: Create recommendation with track_id
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .insert({
          track_id: trackId,
          curator_fid: curatorFid,
          music_url: track.url,
          song_title: track.title,
          artist: track.artist,
          artwork_url: track.artwork,
          review: body.review || '',
          genre: body.genre || 'general',
          moods: body.moods || [],
          tip_count: 0,
          total_tips_usd: 0,
          is_public: true,
          platform: track.platform,
          embed_url: track.embedUrl,
        })
        .select()
        .single();

      if (recError) {
        console.error('[TRACK SUBMISSION] Fallback - Error creating recommendation:', recError);
        return NextResponse.json({ success: false, error: recError.message }, { status: 400 });
      }

      // Step 4: Award XP (same as normal flow)
      console.log('[TRACK SUBMISSION] Fallback - Awarding XP...');
      let totalXpEarned = 0;
      const xpActivities = [];

      // Award 10 XP for sharing
      await supabase.rpc('log_curator_activity', {
        p_curator_fid: curatorFid,
        p_activity_type: 'share',
        p_xp_earned: 10,
        p_recommendation_id: recommendation.id,
        p_track_id: trackId,
        p_metadata: null
      });
      totalXpEarned += 10;
      xpActivities.push({ type: 'share', xp: 10 });
      console.log('[TRACK SUBMISSION] Fallback - +10 XP for sharing');

      // Award 50 XP per taste overlap curator
      if (tasteOverlapCurators.length > 0) {
        for (const otherRec of tasteOverlapCurators) {
          await supabase.rpc('log_curator_activity', {
            p_curator_fid: curatorFid,
            p_activity_type: 'taste_overlap',
            p_xp_earned: 50,
            p_recommendation_id: recommendation.id,
            p_track_id: trackId,
            p_metadata: {
              other_curator_fid: otherRec.curator_fid,
              other_curator_username: otherRec.curator?.username,
              other_curator_pfp: otherRec.curator?.farcaster_pfp_url
            }
          });
          totalXpEarned += 50;
          xpActivities.push({
            type: 'taste_overlap',
            xp: 50,
            curator: {
              fid: otherRec.curator_fid,
              username: otherRec.curator?.username,
              pfpUrl: otherRec.curator?.farcaster_pfp_url
            }
          });
          console.log(`[TRACK SUBMISSION] Fallback - +50 XP for taste overlap with @${otherRec.curator?.username}`);
        }
      }

      // Get updated user XP total
      const { data: userData } = await supabase
        .from('users')
        .select('xp')
        .eq('farcaster_fid', curatorFid)
        .single();

      console.log(`[TRACK SUBMISSION] Fallback - Total XP earned: ${totalXpEarned}, User total: ${userData?.xp || 0}`);

      // Return track with DB-generated ID
      const savedTrack: MusicTrack = {
        id: recommendation.id,
        url: track.url,
        platform: track.platform,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        embedUrl: track.embedUrl,
        tips: 0,
        sharedBy: track.sharedBy,
        timestamp: new Date(recommendation.created_at).getTime(),
        review: body.review,
      };

      console.log('[TRACK SUBMISSION] Fallback - Successfully saved track and recommendation');
      return NextResponse.json({
        success: true,
        track: savedTrack,
        xp: {
          earned: totalXpEarned,
          total: userData?.xp || 0,
          activities: xpActivities
        }
      });
    }
  } catch (error) {
    console.error('[TRACK SUBMISSION] Error saving track:', error);
    return NextResponse.json({ success: false, error: 'Invalid track data' }, { status: 400 });
  }
}
