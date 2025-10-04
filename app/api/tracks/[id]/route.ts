import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '@/types/music';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Transform to MusicTrack format
    const track: MusicTrack = {
      id: data.id,
      url: data.music_url,
      platform: data.platform || 'other',
      title: data.song_title,
      artist: data.artist,
      artwork: data.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music',
      embedUrl: data.embed_url || '',
      tips: data.tip_count,
      sharedBy: {
        fid: 0,
        username: data.curator_address,
      },
      timestamp: new Date(data.created_at).getTime(),
    };

    return NextResponse.json({ track });
  } catch (error) {
    console.error('Error fetching track:', error);
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await request.json();

  if (action === 'tip') {
    try {
      // Increment tip count
      const { data, error } = await supabase
        .from('recommendations')
        .update({ tip_count: supabase.sql`tip_count + 1` })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 });
      }

      // Transform to MusicTrack format
      const track: MusicTrack = {
        id: data.id,
        url: data.music_url,
        platform: data.platform || 'other',
        title: data.song_title,
        artist: data.artist,
        artwork: data.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music',
        embedUrl: data.embed_url || '',
        tips: data.tip_count,
        sharedBy: {
          fid: 0,
          username: data.curator_address,
        },
        timestamp: new Date(data.created_at).getTime(),
      };

      return NextResponse.json({ success: true, track });
    } catch (error) {
      console.error('Error tipping track:', error);
      return NextResponse.json({ error: 'Failed to tip track' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
