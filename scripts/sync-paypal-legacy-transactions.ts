#!/usr/bin/env npx tsx
/**
 * PayPal Legacy Transaction History Sync
 * 
 * Fetches all historical transactions from PayPal Legacy account
 * and syncs them to payment_history table (without duplicates).
 * 
 * Usage:
 *   npx tsx scripts/sync-paypal-legacy-transactions.ts              # Full sync
 *   npx tsx scripts/sync-paypal-legacy-transactions.ts --dry-run    # Preview
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Legacy PayPal account
const paypalLegacyClientId = process.env.PAYPAL_LEGACY_CLIENT_ID!;
const paypalLegacyClientSecret = process.env.PAYPAL_LEGACY_CLIENT_SECRET!;
const paypalMode = process.env.PAYPAL_MODE || 'live';

if (!paypalLegacyClientId || !paypalLegacyClientSecret) {
  console.error('❌ PAYPAL_LEGACY_CLIENT_ID and PAYPAL_LEGACY_CLIENT_SECRET are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const isDryRun = process.argv.includes('--dry-run');

const baseUrl = paypalMode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

interface TransactionStats {
  transactionsFetched: number;
  transactionsInserted: number;
  transactionsSkipped: number;
  totalRevenue: number;
  errors: number;
}

const stats: TransactionStats = {
  transactionsFetched: 0,
  transactionsInserted: 0,
  transactionsSkipped: 0,
  totalRevenue: 0,
  errors: 0,
};

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${paypalLegacyClientId}:${paypalLegacyClientSecret}`).toString('base64');
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_initiation_date: string;
    transaction_updated_date: string;
    transaction_amount: {
      currency_code: string;
      value: string;
    };
    transaction_status: string;
    transaction_subject?: string;
    payer_info?: {
      email_address?: string;
    };
    custom_field?: string;
  };
  payer_info?: {
    email_address?: string;
    account_id?: string;
  };
  cart_info?: {
    item_details?: Array<{
      item_name?: string;
    }>;
  };
}

interface TransactionSearchResponse {
  transaction_details: PayPalTransaction[];
  total_items: number;
  total_pages: number;
  page: number;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

async function fetchTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
  page: number = 1
): Promise<TransactionSearchResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    page_size: '100',
    page: page.toString(),
    fields: 'all',
    transaction_status: 'S', // Successful only
  });

  const response = await fetch(
    `${baseUrl}/v1/reporting/transactions?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch transactions: ${response.status} - ${text}`);
  }

  return response.json();
}

async function findUserByEmail(email: string): Promise<string | null> {
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (exactMatch) return exactMatch.id;

  // Try case-insensitive match
  const { data: ilikeMatch } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .limit(1);

  if (ilikeMatch && ilikeMatch.length > 0) return ilikeMatch[0].id;

  return null;
}

async function transactionExists(transactionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('payment_history')
    .select('id')
    .eq('gateway_identifier', transactionId)
    .single();

  return !!data;
}

function getTransactionType(eventCode: string): string {
  // PayPal transaction event codes
  // T0000 - General payment
  // T0002 - Subscription payment
  // T0006 - Express Checkout payment
  // T0007 - Website Payments Standard payment
  // T0011 - Subscription payment
  // T0012 - Subscription cancellation
  // T0013 - Subscription creation
  
  if (eventCode.startsWith('T001') || eventCode === 'T0002') {
    return 'renewal'; // Subscription payments
  }
  if (eventCode === 'T0013') {
    return 'subscription'; // Subscription creation
  }
  return 'purchase'; // One-time or general
}

async function syncTransactions(): Promise<void> {
  console.log('============================================================');
  console.log('PayPal Legacy Transaction History Sync');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log('============================================================\n');

  console.log('🔑 Getting PayPal access token...');
  const accessToken = await getPayPalAccessToken();
  console.log('✅ Access token obtained\n');

  // PayPal only allows 31-day windows, so we need to fetch in monthly chunks
  // Fetch transactions from the last 3 years
  const now = new Date();
  const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
  
  console.log(`📅 Fetching transactions from ${threeYearsAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
  console.log('Fetching in 30-day chunks (PayPal API limit)...\n');

  let allTransactions: PayPalTransaction[] = [];
  let currentStart = new Date(threeYearsAgo);
  let monthCount = 0;

  while (currentStart < now) {
    monthCount++;
    const currentEnd = new Date(Math.min(
      currentStart.getTime() + 30 * 24 * 60 * 60 * 1000, // 30 days
      now.getTime()
    ));

    const startStr = currentStart.toISOString();
    const endStr = currentEnd.toISOString();

    console.log(`📆 Period ${monthCount}: ${startStr.split('T')[0]} to ${endStr.split('T')[0]}`);

    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        const result = await fetchTransactions(accessToken, startStr, endStr, currentPage);
        
        if (result.transaction_details && result.transaction_details.length > 0) {
          allTransactions = allTransactions.concat(result.transaction_details);
          totalPages = result.total_pages || 1;
          console.log(`    Page ${currentPage}/${totalPages}: ${result.transaction_details.length} transactions`);
        }
        
        currentPage++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } while (currentPage <= totalPages);

    } catch (error: any) {
      if (error.message.includes('No transactions found')) {
        console.log(`    No transactions in this period`);
      } else {
        console.error(`  ❌ Error: ${error.message}`);
        stats.errors++;
      }
    }

    // Move to next 30-day window
    currentStart = new Date(currentEnd.getTime() + 1000); // +1 second to avoid overlap
    
    // Small delay between periods
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Total transactions fetched: ${allTransactions.length}\n`);
  stats.transactionsFetched = allTransactions.length;

  // Process each transaction
  console.log('💾 Syncing transactions to database...\n');

  for (const tx of allTransactions) {
    const txInfo = tx.transaction_info;
    const transactionId = txInfo.transaction_id;
    const amount = parseFloat(txInfo.transaction_amount?.value || '0');
    const currency = txInfo.transaction_amount?.currency_code || 'USD';
    const payerEmail = tx.payer_info?.email_address || txInfo.payer_info?.email_address;
    const itemName = tx.cart_info?.item_details?.[0]?.item_name || txInfo.transaction_subject || 'PayPal Legacy Payment';
    const transactionDate = txInfo.transaction_initiation_date;
    const eventCode = txInfo.transaction_event_code || 'T0000';

    // Skip refunds and negative amounts
    if (amount <= 0) {
      continue;
    }

    // Check if transaction already exists
    const exists = await transactionExists(transactionId);
    if (exists) {
      stats.transactionsSkipped++;
      continue;
    }

    // Find user by email
    let userId: string | null = null;
    if (payerEmail) {
      userId = await findUserByEmail(payerEmail);
    }

    const transactionType = getTransactionType(eventCode);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would insert: ${transactionId} - ${payerEmail || 'unknown'} - $${amount} ${currency} (${transactionType})`);
      stats.transactionsInserted++;
      stats.totalRevenue += amount;
    } else {
      const { error } = await supabase.from('payment_history').insert({
        user_id: userId,
        transaction_type: transactionType,
        gateway: 'paypal_legacy',
        gateway_identifier: transactionId,
        currency: currency,
        amount: amount,
        item_name: itemName,
        redirect_status: 'success',
        callback_status: 'completed',
        is_legacy: true,
        created_at: transactionDate,
      });

      if (error) {
        console.error(`  ❌ Error inserting ${transactionId}: ${error.message}`);
        stats.errors++;
      } else {
        console.log(`  ✅ ${transactionId} - ${payerEmail || 'unknown'} - $${amount} (${transactionType})`);
        stats.transactionsInserted++;
        stats.totalRevenue += amount;
      }
    }
  }

  // Print summary
  console.log('\n============================================================');
  console.log('TRANSACTION SYNC SUMMARY');
  console.log('============================================================');
  console.log(`Transactions fetched: ${stats.transactionsFetched}`);
  console.log(`Transactions inserted: ${stats.transactionsInserted}`);
  console.log(`Transactions skipped (duplicates): ${stats.transactionsSkipped}`);
  console.log(`Total revenue: $${stats.totalRevenue.toFixed(2)}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('\n✅ Transaction sync complete!');
}

syncTransactions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

