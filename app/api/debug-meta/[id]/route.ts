import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://music-curator.vercel.app';
  const artwork = data.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music';

  const miniAppMetadata = {
    version: '1',
    imageUrl: artwork,
    button: {
      title: '▶ Play',
      action: {
        type: 'launch',
        name: 'Music Player',
        url: `${baseUrl}/play?trackId=${data.id}`,
        splashImageUrl: `${baseUrl}/curio-logo.png`,
        splashBackgroundColor: '#1a1a1a',
      },
    },
  };

  return NextResponse.json({
    track: {
      id: data.id,
      title: data.song_title,
      artist: data.artist,
      artwork: artwork,
    },
    metadata: {
      'fc:miniapp': miniAppMetadata,
      'og:image': artwork,
      'og:title': data.song_title,
      'og:description': `by ${data.artist}`,
    },
    trackUrl: `${baseUrl}/track/${data.id}`,
  });
}
