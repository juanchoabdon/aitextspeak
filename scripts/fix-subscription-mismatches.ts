#!/usr/bin/env npx tsx
/**
 * Fix script to repair subscription mismatches:
 * 1. Users with successful payments but no active subscription -> Create subscription
 * 2. Users with active subscription but wrong role -> Update role to 'pro'
 * 
 * Run with --dry-run first to see what would be changed.
 * Run without --dry-run to actually fix.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`🔧 Fixing subscription mismatches... ${isDryRun ? '(DRY RUN)' : '(LIVE)'}\n`);

  // === FIX 1: Users with active subscription but wrong role ===
  console.log('=== Fixing users with active subscription but wrong role ===\n');
  
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, provider')
    .eq('status', 'active');

  let roleFixCount = 0;
  for (const sub of activeSubs || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', sub.user_id)
      .single();

    if (profile && profile.role !== 'pro' && profile.role !== 'admin') {
      console.log(`✅ ${profile.email}: ${profile.role} -> pro (has ${sub.plan_name})`);
      
      if (!isDryRun) {
        await supabase
          .from('profiles')
          .update({ role: 'pro' })
          .eq('id', sub.user_id);
      }
      roleFixCount++;
    }
  }
  console.log(`\n${isDryRun ? 'Would fix' : 'Fixed'} ${roleFixCount} user roles\n`);

  // === FIX 2: Users with payments but no subscription ===
  console.log('=== Fixing users with payments but no active subscription ===\n');
  
  // Get all users with payments (success OR legacy pending - legacy pending often means charged but callback failed)
  const { data: successfulPayments } = await supabase
    .from('payment_history')
    .select('user_id, amount, gateway, item_name, created_at, redirect_status, is_legacy')
    .or('redirect_status.eq.success,and(redirect_status.eq.pending,is_legacy.eq.true)')
    .order('created_at', { ascending: false });

  // Group by user and get most recent payment
  const userPayments = new Map<string, typeof successfulPayments[0]>();
  for (const p of successfulPayments || []) {
    if (!userPayments.has(p.user_id)) {
      userPayments.set(p.user_id, p);
    }
  }

  let subFixCount = 0;
  let skippedCount = 0;

  for (const [userId, payment] of userPayments) {
    // Check if user already has an active subscription
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (activeSub) {
      continue; // Already has active subscription
    }

    // Check if user has ANY subscription record (even non-active)
    const { data: anySub } = await supabase
      .from('subscriptions')
      .select('id, status, plan_name, provider')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, is_legacy_user')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.log(`⚠️  Skipping ${userId}: no profile found`);
      skippedCount++;
      continue;
    }

    // Determine plan based on payment
    let planId = 'monthly';
    let planName = 'Basic Plan';
    let isLifetime = false;
    
    const itemName = (payment.item_name || '').toLowerCase();
    if (itemName.includes('lifetime')) {
      planId = 'lifetime';
      planName = 'Lifetime';
      isLifetime = true;
    } else if (itemName.includes('pro') || itemName.includes('standard') || payment.amount >= 19) {
      planId = 'monthly_pro';
      planName = 'Pro Plan';
    } else if (itemName.includes('6 month') || itemName.includes('annual') || payment.amount >= 29) {
      planId = 'basic_annual';
      planName = '6 Month Package';
    }

    // Determine provider
    let provider = payment.gateway || 'stripe';
    if (profile.is_legacy_user && provider === 'paypal') {
      provider = 'paypal_legacy';
    }

    console.log(`✅ ${profile.email}: Creating subscription (${planName} via ${provider})`);
    console.log(`   Based on payment: ${payment.item_name} - $${payment.amount} on ${new Date(payment.created_at).toLocaleDateString()}`);

    if (!isDryRun) {
      if (anySub) {
        // Update existing subscription to active
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_id: planId,
            plan_name: planName,
          })
          .eq('id', anySub.id);
      } else {
        // Create new subscription
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            provider: provider,
            provider_subscription_id: `legacy_fix_${userId}_${Date.now()}`,
            status: 'active',
            plan_id: planId,
            plan_name: planName,
            price_amount: Math.round(payment.amount * 100),
            price_currency: 'USD',
            billing_interval: isLifetime ? null : 'month',
            current_period_start: payment.created_at,
            current_period_end: isLifetime ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_legacy: profile.is_legacy_user || false,
          });
      }

      // Also update role to pro
      await supabase
        .from('profiles')
        .update({ role: 'pro' })
        .eq('id', userId);
    }

    subFixCount++;
  }

  console.log(`\n${isDryRun ? 'Would fix' : 'Fixed'} ${subFixCount} subscriptions`);
  console.log(`Skipped: ${skippedCount}\n`);

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Role fixes: ${roleFixCount}`);
  console.log(`Subscription fixes: ${subFixCount}`);
  console.log(`Skipped: ${skippedCount}`);
  
  if (isDryRun) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ All fixes applied!');
  }
}

main().catch(console.error);

