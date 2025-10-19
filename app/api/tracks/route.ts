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

      // Step 4: Create recommendation linking curator to track
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
      return NextResponse.json({ success: true, track: savedTrack });

    } else {
      // Fallback: Use old schema if Songlink fails
      console.log('[TRACK SUBMISSION] Using fallback (old schema)');
      const insertData = {
        curator_fid: curatorFid,
        music_url: track.url,
        song_title: track.title,
        artist: track.artist,
        review: body.review || '',
        genre: body.genre || 'general',
        moods: body.moods || [],
        tip_count: 0,
        total_tips_usd: 0,
        platform: track.platform,
        artwork_url: track.artwork,
        embed_url: track.embedUrl,
      };

      const { data, error } = await supabase
        .from('recommendations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[TRACK SUBMISSION] Fallback insert error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      const savedTrack: MusicTrack = {
        ...track,
        id: data.id,
        tips: 0,
      };

      return NextResponse.json({ success: true, track: savedTrack });
    }
  } catch (error) {
    console.error('[TRACK SUBMISSION] Error saving track:', error);
    return NextResponse.json({ success: false, error: 'Invalid track data' }, { status: 400 });
  }
}
