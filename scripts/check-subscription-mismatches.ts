#!/usr/bin/env npx tsx
/**
 * Diagnostic script to find users with payment issues:
 * 1. Users with successful payments but no active subscription
 * 2. Users with role='pro' but no active subscription
 * 3. Users with active subscription but role!='pro'
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Checking for subscription mismatches...\n');

  // 1. Find users with successful payments but no active subscription
  console.log('=== Users with successful payments but no active subscription ===');
  
  const { data: successfulPayments } = await supabase
    .from('payment_history')
    .select('user_id, amount, gateway, item_name, redirect_status, created_at')
    .eq('redirect_status', 'success')
    .order('created_at', { ascending: false });

  const usersWithSuccessPayments = [...new Set(successfulPayments?.map(p => p.user_id) || [])];
  
  let mismatchCount1 = 0;
  for (const userId of usersWithSuccessPayments) {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id, status, plan_name, provider')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!activeSub) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', userId)
        .single();

      const payments = successfulPayments?.filter(p => p.user_id === userId) || [];
      
      console.log(`\n❌ User: ${profile?.email || userId}`);
      console.log(`   Role: ${profile?.role || 'unknown'}`);
      console.log(`   Successful payments:`);
      payments.forEach(p => {
        console.log(`   - ${p.item_name || 'Unknown'} via ${p.gateway}: $${p.amount} (${new Date(p.created_at).toLocaleDateString()})`);
      });
      mismatchCount1++;
    }
  }
  console.log(`\nTotal: ${mismatchCount1} users with successful payments but no active subscription`);

  // 2. Find users with role='pro' but no active subscription
  console.log('\n\n=== Users with role="pro" but no active subscription ===');
  
  const { data: proUsers } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'pro');

  let mismatchCount2 = 0;
  for (const user of proUsers || []) {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id, status, plan_name, provider')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!activeSub) {
      console.log(`\n❌ User: ${user.email}`);
      console.log(`   Role: ${user.role} (but no active subscription)`);
      
      // Check if they have any subscription
      const { data: anySub } = await supabase
        .from('subscriptions')
        .select('id, status, plan_name, provider, canceled_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (anySub) {
        console.log(`   Last subscription: ${anySub.plan_name} (${anySub.status}) via ${anySub.provider}`);
        if (anySub.canceled_at) console.log(`   Canceled at: ${new Date(anySub.canceled_at).toLocaleDateString()}`);
      } else {
        console.log(`   No subscriptions found at all`);
      }
      mismatchCount2++;
    }
  }
  console.log(`\nTotal: ${mismatchCount2} users with role="pro" but no active subscription`);

  // 3. Find users with active subscription but role != 'pro'
  console.log('\n\n=== Users with active subscription but role != "pro" ===');
  
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, provider, status')
    .eq('status', 'active');

  let mismatchCount3 = 0;
  for (const sub of activeSubs || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', sub.user_id)
      .single();

    if (profile && profile.role !== 'pro' && profile.role !== 'admin') {
      console.log(`\n❌ User: ${profile.email}`);
      console.log(`   Role: ${profile.role} (should be "pro")`);
      console.log(`   Active subscription: ${sub.plan_name} via ${sub.provider}`);
      mismatchCount3++;
    }
  }
  console.log(`\nTotal: ${mismatchCount3} users with active subscription but wrong role`);

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`1. Users with successful payments but no active subscription: ${mismatchCount1}`);
  console.log(`2. Users with role="pro" but no active subscription: ${mismatchCount2}`);
  console.log(`3. Users with active subscription but wrong role: ${mismatchCount3}`);
  
  if (mismatchCount1 + mismatchCount2 + mismatchCount3 > 0) {
    console.log('\n⚠️  Run with --fix to attempt to repair these issues');
  } else {
    console.log('\n✅ No mismatches found!');
  }
}

main().catch(console.error);

