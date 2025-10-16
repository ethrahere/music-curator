import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '@/types/music';
import { DEFAULT_ARTWORK_URL } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, curator:users!curator_fid(farcaster_fid, username, curator_score, wallet_address)')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching track:', error);
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Transform to MusicTrack format
    const track: MusicTrack = {
      id: data.id,
      url: data.music_url,
      platform: data.platform || 'other',
      title: data.song_title,
      artist: data.artist,
      artwork: data.artwork_url || DEFAULT_ARTWORK_URL,
      embedUrl: data.embed_url || '',
      tips: data.total_tips_usd || 0,
      sharedBy: {
        fid: data.curator?.farcaster_fid || 0,
        username: data.curator?.username || 'unknown',
        curatorScore: data.curator?.curator_score || 0,
        walletAddress: data.curator?.wallet_address || undefined,
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
      // First get current tip count
      const { data: currentData } = await supabase
        .from('recommendations')
        .select('tip_count')
        .eq('id', id)
        .single();

      if (!currentData) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 });
      }

      // Increment tip count
      const { data, error } = await supabase
        .from('recommendations')
        .update({ tip_count: currentData.tip_count + 1 })
        .eq('id', id)
        .select('*, curator:users!curator_fid(farcaster_fid, username, curator_score)')
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
        artwork: data.artwork_url || DEFAULT_ARTWORK_URL,
        embedUrl: data.embed_url || '',
        tips: data.total_tips_usd || 0,
        sharedBy: {
          fid: data.curator?.farcaster_fid || 0,
          username: data.curator?.username || 'unknown',
          curatorScore: data.curator?.curator_score || 0,
          walletAddress: data.curator?.wallet_address || undefined,
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
