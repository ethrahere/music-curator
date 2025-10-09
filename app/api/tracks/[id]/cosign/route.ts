import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userFid } = await request.json();

    if (!userFid) {
      return NextResponse.json({ success: false, error: 'Missing user FID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if track exists
    const { data: track } = await supabase
      .from('recommendations')
      .select('id, curator_fid')
      .eq('id', id)
      .single();

    if (!track) {
      return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 });
    }

    // Prevent self-cosigning
    if (track.curator_fid === userFid) {
      return NextResponse.json({ success: false, error: 'Cannot co-sign your own track' }, { status: 400 });
    }

    // Check if already co-signed
    const { data: existingCoSign } = await supabase
      .from('co_signs')
      .select('id')
      .eq('recommendation_id', id)
      .eq('user_fid', userFid)
      .single();

    if (existingCoSign) {
      return NextResponse.json({ success: false, error: 'Already co-signed' }, { status: 400 });
    }

    // Insert co-sign
    const { error } = await supabase
      .from('co_signs')
      .insert({
        recommendation_id: id,
        user_fid: userFid,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to co-sign:', error);
      return NextResponse.json({ success: false, error: 'Failed to co-sign' }, { status: 500 });
    }

    // Get updated count
    const { count } = await supabase
      .from('co_signs')
      .select('id', { count: 'exact', head: true })
      .eq('recommendation_id', id);

    return NextResponse.json({ success: true, coSignCount: count || 0 });
  } catch (error) {
    console.error('Error in co-sign endpoint:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
