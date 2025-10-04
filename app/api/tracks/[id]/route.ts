import { NextRequest, NextResponse } from 'next/server';
import { musicStore } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = musicStore.getTrack(id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  return NextResponse.json({ track });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await request.json();

  if (action === 'tip') {
    const success = musicStore.incrementTips(id);
    if (success) {
      const track = musicStore.getTrack(id);
      return NextResponse.json({ success: true, track });
    }
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
