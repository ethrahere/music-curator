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
    const body = await request.json();
    const { txHash, fromFid, toFid, requestedAmount, tipperUsername } = body;

    console.log('Tip request received:', { id, txHash, fromFid, toFid, requestedAmount, tipperUsername });

    if (!requestedAmount || !fromFid || !tipperUsername) {
      console.error('Missing required fields:', { requestedAmount, fromFid, tipperUsername });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get track details with curator info
    const { data: track, error: trackError } = await supabase
      .from('recommendations')
      .select('*, users!recommendations_curator_address_fkey(address, username, farcaster_fid, notification_token)')
      .eq('id', id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { success: false, error: 'Track not found' },
        { status: 404 }
      );
    }

    // Ensure tipper exists in users table
    const tipperAddress = `fid:${fromFid}`;
    const { data: existingTipper } = await supabase
      .from('users')
      .select('address')
      .eq('address', tipperAddress)
      .single();

    if (!existingTipper) {
      await supabase.from('users').insert({
        address: tipperAddress,
        username: tipperUsername,
        farcaster_fid: fromFid,
      });
    }

    // Record tip transaction using address-based schema
    const tipInsertData = {
      recommendation_id: id,
      tipper_address: tipperAddress,
      curator_address: track.curator_address,
      amount: 0, // Legacy integer field
      amount_usd: requestedAmount,
      transaction_hash: txHash,
    };

    console.log('Inserting tip:', tipInsertData);

    const { data: tipData, error: tipError } = await supabase.from('tips').insert(tipInsertData).select();

    if (tipError) {
      console.error('Failed to record tip:', tipError);
      return NextResponse.json(
        { success: false, error: 'Failed to record tip' },
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
    if (track.users?.notification_token) {
      try {
        const notificationUrl = process.env.FARCASTER_NOTIFICATION_URL;
        if (notificationUrl) {
          await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${track.users.notification_token}`,
            },
            body: JSON.stringify({
              notificationId: `tip-${Date.now()}`,
              title: 'You received a tip! 💰',
              body: `@${tipperUsername} tipped you $${requestedAmount} for "${track.song_title}"`,
              targetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track/${id}`,
              tokens: [track.users.notification_token],
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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
