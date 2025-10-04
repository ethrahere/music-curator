import { NextRequest, NextResponse } from 'next/server';
import { musicStore } from '@/lib/store';
import { MusicTrack } from '@/types/music';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get('sort') || 'recent';
  const limit = parseInt(searchParams.get('limit') || '20');

  let tracks: MusicTrack[] = [];

  switch (sort) {
    case 'most_tipped':
      tracks = musicStore.getMostTipped(limit);
      break;
    case 'recent':
    default:
      tracks = musicStore.getRecent(limit);
      break;
  }

  return NextResponse.json({ tracks });
}

export async function POST(request: NextRequest) {
  try {
    const track: MusicTrack = await request.json();
    musicStore.addTrack(track);
    return NextResponse.json({ success: true, track });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid track data' }, { status: 400 });
  }
}
