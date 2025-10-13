import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '@/types/music';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get('sort') || 'recent';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const genre = searchParams.get('genre');

  try {
    let query = supabase
      .from('recommendations')
      .select('*, curator:users!curator_fid(farcaster_fid, username, curator_score)');

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
    const tracks: MusicTrack[] = (data || []).map((rec) => ({
      id: rec.id,
      url: rec.music_url,
      platform: rec.platform || 'other',
      title: rec.song_title,
      artist: rec.artist,
      artwork: rec.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music',
      embedUrl: rec.embed_url || '',
      tips: rec.total_tips_usd || 0,
      sharedBy: {
        fid: rec.curator?.farcaster_fid || 0,
        username: rec.curator?.username || 'unknown',
        curatorScore: rec.curator?.curator_score || 0,
      },
      timestamp: new Date(rec.created_at).getTime(),
      review: rec.review || undefined,
    }));

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

    console.log('Received track data:', {
      review: body.review,
      genre: body.genre,
      moods: body.moods,
      curatorFid,
      curatorPfpUrl,
    });

    // Ensure user exists in users table (upsert)
    await supabase
      .from('users')
      .upsert({
        farcaster_fid: curatorFid,
        username: curatorUsername,
        farcaster_pfp_url: curatorPfpUrl,
      }, {
        onConflict: 'farcaster_fid',
        ignoreDuplicates: false
      });

    // Prepare data for insertion with FID
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

    console.log('Inserting into DB:', insertData);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('recommendations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Return track with DB-generated ID
    const savedTrack: MusicTrack = {
      ...track,
      id: data.id,
      tips: 0,
    };

    return NextResponse.json({ success: true, track: savedTrack });
  } catch (error) {
    console.error('Error saving track:', error);
    return NextResponse.json({ success: false, error: 'Invalid track data' }, { status: 400 });
  }
}
