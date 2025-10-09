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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const userFid = searchParams.get('userFid');

    if (!userFid) {
      return NextResponse.json({ success: false, error: 'Missing user FID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if user has co-signed
    const { data: coSign } = await supabase
      .from('co_signs')
      .select('id')
      .eq('recommendation_id', id)
      .eq('user_fid', parseInt(userFid))
      .single();

    // Get total co-sign count
    const { count } = await supabase
      .from('co_signs')
      .select('id', { count: 'exact', head: true })
      .eq('recommendation_id', id);

    return NextResponse.json({
      success: true,
      hasCoSigned: !!coSign,
      coSignCount: count || 0,
    });
  } catch (error) {
    console.error('Error checking co-sign status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
