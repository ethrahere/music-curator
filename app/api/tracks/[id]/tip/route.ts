import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for write operations, but validate inputs first
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { txHash, fromFid, toFid, requestedAmount, tipperUsername } = body;

    console.log('Tip request received:', { id, txHash, fromFid, toFid, requestedAmount, tipperUsername });

    // Validate required fields
    if (!requestedAmount || !fromFid || !tipperUsername || !txHash) {
      console.error('Missing required fields:', { requestedAmount, fromFid, tipperUsername, txHash });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate data types and ranges
    if (typeof fromFid !== 'number' || fromFid <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid fromFid' },
        { status: 400 }
      );
    }

    if (typeof requestedAmount !== 'number' || requestedAmount <= 0 || requestedAmount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Invalid tip amount (must be between 0 and 10000)' },
        { status: 400 }
      );
    }

    if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get track details with curator info using new FID-based schema
    const { data: track, error: trackError } = await supabase
      .from('recommendations')
      .select('*, curator:users!curator_fid(farcaster_fid, username, notification_token)')
      .eq('id', id)
      .single();

    if (trackError || !track) {
      console.error('Track lookup failed:', trackError);
      return NextResponse.json(
        { success: false, error: 'Track not found', details: trackError?.message },
        { status: 404 }
      );
    }

    // Get curator from the join (much simpler now!)
    const curator = track.curator;
    if (!curator) {
      console.error('Curator not found for track:', id);
      return NextResponse.json(
        { success: false, error: 'Curator not found' },
        { status: 404 }
      );
    }

    console.log('Found curator:', curator);

    // Ensure tipper exists in users table (upsert)
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        farcaster_fid: fromFid,
        username: tipperUsername,
      }, {
        onConflict: 'farcaster_fid',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Failed to upsert tipper user:', upsertError);
    }

    // Record tip using new FID-based schema
    const tipInsertData = {
      recommendation_id: id,
      tipper_fid: fromFid,
      curator_fid: toFid,
      amount: 0, // Legacy integer field
      amount_usd: requestedAmount,
      transaction_hash: txHash,
    };

    console.log('Inserting tip:', tipInsertData);

    const { data: tipData, error: tipError } = await supabase.from('tips').insert(tipInsertData).select();

    if (tipError) {
      console.error('Failed to record tip:', tipError);
      return NextResponse.json(
        { success: false, error: 'Failed to record tip', details: tipError.message, code: tipError.code },
        { status: 500 }
      );
    }

    console.log('Tip inserted successfully:', tipData);

    // Update tip count and total on recommendation
    const newTipCount = (track.tip_count || 0) + 1;
    const newTotalTips = (track.total_tips_usd || 0) + requestedAmount;

    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        tip_count: newTipCount,
        total_tips_usd: newTotalTips,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update tip count:', updateError);
    }

    // Send notification to curator
    if (curator?.notification_token) {
      try {
        const notificationUrl = process.env.FARCASTER_NOTIFICATION_URL;
        if (notificationUrl) {
          await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${curator.notification_token}`,
            },
            body: JSON.stringify({
              notificationId: `tip-${Date.now()}`,
              title: 'You received a tip! 💰',
              body: `@${tipperUsername} tipped you $${requestedAmount} for "${track.song_title}"`,
              targetUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/track/${id}`,
              tokens: [curator.notification_token],
            }),
          });
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      tipCount: newTipCount,
      totalTips: newTotalTips,
    });
  } catch (error) {
    console.error('Tip error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
