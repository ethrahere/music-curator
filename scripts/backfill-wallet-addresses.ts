/**
 * Backfill wallet addresses for existing users
 * Fetches verified addresses from Farcaster Hub API and updates the database
 *
 * Run with: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx scripts/backfill-wallet-addresses.ts
 */

import { createClient } from '@supabase/supabase-js';

const FARCASTER_HUB_URL = 'https://nemes.farcaster.xyz:2281';

// Initialize Supabase client
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
};

interface VerificationMessage {
  data: {
    verificationAddEthAddressBody: {
      address: string;
    };
  };
}

interface VerificationsResponse {
  messages: VerificationMessage[];
}

// Fetch verified addresses from Farcaster Hub
async function getVerifiedAddresses(fid: number): Promise<string[]> {
  try {
    console.log(`Fetching verified addresses for FID ${fid}...`);
    const response = await fetch(
      `${FARCASTER_HUB_URL}/v1/verificationsByFid?fid=${fid}`
    );

    if (!response.ok) {
      console.error(`Hub API error for FID ${fid}: ${response.status}`);
      return [];
    }

    const data: VerificationsResponse = await response.json();
    const addresses = data.messages?.map(
      (msg) => msg.data.verificationAddEthAddressBody.address
    ) || [];

    console.log(`Found ${addresses.length} verified address(es) for FID ${fid}`);
    return addresses;
  } catch (error) {
    console.error(`Failed to fetch addresses for FID ${fid}:`, error);
    return [];
  }
}

async function backfillWalletAddresses() {
  const supabase = getSupabase();

  console.log('Starting wallet address backfill...\n');

  // Get all users who don't have a wallet address
  const { data: users, error } = await supabase
    .from('users')
    .select('farcaster_fid, username, wallet_address')
    .order('farcaster_fid', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  console.log(`Found ${users.length} users in database.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    console.log(`\n--- Processing: ${user.username} (FID: ${user.farcaster_fid}) ---`);

    // Skip if already has wallet address
    if (user.wallet_address) {
      console.log(`✓ Already has wallet address: ${user.wallet_address}`);
      skipped++;
      continue;
    }

    // Fetch verified addresses from Hub
    const addresses = await getVerifiedAddresses(user.farcaster_fid);

    if (addresses.length === 0) {
      console.log(`⚠ No verified addresses found`);
      failed++;
      continue;
    }

    // Use the first verified address
    const primaryAddress = addresses[0];
    console.log(`Using primary address: ${primaryAddress}`);

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_address: primaryAddress })
      .eq('farcaster_fid', user.farcaster_fid);

    if (updateError) {
      console.error(`✗ Failed to update: ${updateError.message}`);
      failed++;
    } else {
      console.log(`✓ Updated successfully`);
      updated++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Backfill Summary ===');
  console.log(`Total users: ${users.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already had address): ${skipped}`);
  console.log(`Failed (no verified addresses): ${failed}`);
  console.log('========================\n');
}

// Run the script
backfillWalletAddresses()
  .then(() => {
    console.log('Backfill completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
