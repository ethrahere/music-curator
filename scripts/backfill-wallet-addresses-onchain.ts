/**
 * Backfill wallet addresses for existing users using Farcaster Id Registry contract
 *
 * This script queries the Id Registry contract on OP Mainnet to get custody addresses
 * for existing users and updates the database.
 */

import { createPublicClient, http } from 'viem';
import { optimism } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Farcaster Id Registry contract address on OP Mainnet
const ID_REGISTRY_ADDRESS = '0x00000000fc6c5f01fc30151999387bb99a9f489b' as const;

// Id Registry ABI (only the custodyOf function we need)
const idRegistryAbi = [
  {
    inputs: [{ name: 'fid', type: 'uint256' }],
    name: 'custodyOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Initialize viem client for OP Mainnet
const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});

async function getCustodyAddress(fid: number): Promise<string | null> {
  try {
    const address = await publicClient.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idRegistryAbi,
      functionName: 'custodyOf',
      args: [BigInt(fid)],
    });

    // Return null if zero address (fid doesn't exist)
    if (address === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return address;
  } catch (error) {
    console.error(`Error getting custody address for fid ${fid}:`, error);
    return null;
  }
}

async function backfillWalletAddresses() {
  console.log('Starting wallet address backfill from Id Registry contract...\n');

  // Get all users without wallet addresses
  const { data: users, error } = await supabase
    .from('users')
    .select('farcaster_fid, username')
    .is('wallet_address', null);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found without wallet addresses.');
    return;
  }

  console.log(`Found ${users.length} users without wallet addresses.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    console.log(`Processing ${user.username} (FID: ${user.farcaster_fid})...`);

    const walletAddress = await getCustodyAddress(user.farcaster_fid);

    if (walletAddress) {
      // Update database
      const { error: updateError } = await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('farcaster_fid', user.farcaster_fid);

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ Updated: ${walletAddress}`);
        successCount++;
      }
    } else {
      console.log(`  ⚠️  No custody address found (fid may not exist)`);
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${users.length}`);
}

// Run the script
backfillWalletAddresses()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
