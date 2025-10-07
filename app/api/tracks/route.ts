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
      .select('*, users!recommendations_curator_address_fkey(farcaster_fid, username)');

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
      tips: rec.total_tips_usd || 0, // Show total USDC amount
      sharedBy: {
        fid: rec.users?.farcaster_fid || 0,
        username: rec.users?.username || rec.curator_address,
      },
      timestamp: new Date(rec.created_at).getTime(),
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
    const curatorAddress = track.sharedBy.username || 'anonymous';

    console.log('Received track data:', {
      review: body.review,
      genre: body.genre,
      moods: body.moods,
    });

    // First, ensure user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('address')
      .eq('address', curatorAddress)
      .single();

    if (!existingUser) {
      // Create user if doesn't exist
      await supabase
        .from('users')
        .insert({
          address: curatorAddress,
          username: curatorAddress,
          farcaster_fid: track.sharedBy.fid,
        });
    }

    // Prepare data for insertion
    const insertData = {
      curator_address: curatorAddress,
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
