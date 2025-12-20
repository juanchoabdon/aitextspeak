import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getUserActiveSubscription } from '@/lib/payments/subscription';
import { PLANS, getPlanByStripePrice } from '@/lib/payments/plans';
import { BillingClient } from '@/components/billing/BillingClient';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { getCurrentUsage } from '@/lib/usage';
import { stripe } from '@/lib/payments/stripe';

export const metadata = {
  title: 'Billing - AI TextSpeak',
  description: 'Manage your subscription and billing',
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

/**
 * Immediately activate Stripe subscription on redirect (don't wait for webhook)
 */
async function activateStripeSessionIfNeeded(sessionId: string, userId: string) {
  if (!sessionId) return;

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Verify this session belongs to this user
    if (session.metadata?.userId !== userId) {
      console.log('[Billing] Session userId mismatch, skipping immediate activation');
      return;
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('[Billing] Payment not yet paid, skipping immediate activation');
      return;
    }

    const adminClient = createAdminClient();

    // Check if user is already pro (webhook might have already processed)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'pro') {
      console.log('[Billing] User already pro, skipping');
      return;
    }

    console.log('[Billing] Immediately activating user from Stripe session:', sessionId);

    // Handle subscription vs one-time payment
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionData = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

      // Cast to access period dates (Stripe types don't always include these)
      const subscription = subscriptionData as typeof subscriptionData & {
        current_period_start?: number;
        current_period_end?: number;
      };

      const plan = getPlanByStripePrice(subscription.items.data[0].price.id);
      const planId = session.metadata?.planId || plan?.id || 'monthly';

      // Upsert subscription record
      await adminClient.from('subscriptions').upsert({
        user_id: userId,
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        provider_customer_id: session.customer as string,
        status: 'active',
        plan_id: planId,
        plan_name: plan?.name || planId,
        price_amount: subscription.items.data[0].price.unit_amount || 0,
        price_currency: subscription.currency.toUpperCase(),
        billing_interval: subscription.items.data[0].price.recurring?.interval as 'month' | 'year',
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString() 
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        is_legacy: false,
      }, {
        onConflict: 'provider,provider_subscription_id',
      });
    } else {
      // One-time payment (lifetime)
      await adminClient.from('subscriptions').upsert({
        user_id: userId,
        provider: 'stripe',
        provider_subscription_id: session.payment_intent as string,
        provider_customer_id: session.customer as string,
        status: 'active',
        plan_id: 'lifetime',
        plan_name: 'Lifetime',
        price_amount: session.amount_total || 0,
        price_currency: session.currency?.toUpperCase() || 'USD',
        billing_interval: null,
        is_legacy: false,
      }, {
        onConflict: 'provider,provider_subscription_id',
      });
    }

    // Update user role to pro
    await adminClient
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', userId);

    console.log('[Billing] ✅ User activated immediately from Stripe redirect');
  } catch (error) {
    // Don't fail the page load if this errors - webhook will still work
    console.error('[Billing] Error activating from Stripe session:', error);
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; session_id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const params = await searchParams;

  // Immediately activate Stripe session if coming from successful checkout
  if (params.success && params.session_id) {
    await activateStripeSessionIfNeeded(params.session_id, user.id);
  }

  const subscription = await getUserActiveSubscription(user.id);
  const usage = await getCurrentUsage(user.id);

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Also get raw subscription data for billing details
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const currentPlan = PLANS[subscription.planId] || PLANS.free;
  const billingLabel =
    subscription.planId === 'lifetime' || currentPlan.interval === 'one_time'
      ? 'One-time (Lifetime)'
      : subscription.isAnnual
        ? 'Annually'
        : 'Monthly';
  const nextBillingLabel = subscription.isAnnual ? 'Renewal date:' : 'Next billing date:';

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Billing & Subscription</h1>

          {params.success && (
            <div className="mb-6 rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-400">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Your subscription has been activated successfully!</span>
              </div>
            </div>
          )}

          {params.canceled && (
            <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-400">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Payment was canceled. No charges were made.</span>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Current Plan */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400">Current Plan</p>
                  <h2 className="text-2xl font-bold text-white">{subscription.planName}</h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscription.isActive && subscription.provider !== 'free'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {subscription.isActive && subscription.provider !== 'free' ? 'Active' : 'Free Plan'}
                </div>
              </div>

              {subscription.isActive && subscription.provider !== 'free' && (
                <div className="space-y-2 text-sm text-slate-400">
                  <p>
                    <span className="text-slate-500">Provider:</span>{' '}
                    <span className="text-white capitalize">{subscription.provider.replace('_', ' ')}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Billing:</span>{' '}
                    <span className="text-white capitalize">
                      {billingLabel}
                    </span>
                  </p>
                  {subscription.expiresAt && (
                    <p>
                      <span className="text-slate-500">
                        {nextBillingLabel}
                      </span>{' '}
                      <span className="text-white">
                        {new Date(subscription.expiresAt).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  {subscription.isLegacy && (
                    <p className="mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                        Legacy Subscription
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Features */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-3">Included features:</p>
                <ul className="space-y-2">
                  {currentPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <BillingClient 
                  subscription={subscriptionData}
                  profile={profile}
                  userSubscription={subscription}
                />
              </div>
            </div>

            {/* Usage */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Usage This Month</h3>
              
              <div className="space-y-6">
                {/* Characters Usage */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Characters Used</span>
                    <span className="text-white font-medium">
                      {usage.isUnlimited ? (
                        <>{usage.charactersUsed.toLocaleString()} <span className="text-slate-400">(Unlimited)</span></>
                      ) : (
                        <>{usage.charactersUsed.toLocaleString()} / {usage.charactersLimit.toLocaleString()}</>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        usage.isUnlimited 
                          ? 'bg-green-500' 
                          : usage.percentUsed >= 90 
                          ? 'bg-red-500' 
                          : usage.percentUsed >= 70 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: usage.isUnlimited ? '5%' : `${Math.min(100, usage.percentUsed)}%` }}
                    />
                  </div>
                  {!usage.isUnlimited && (
                    <p className="mt-2 text-xs text-slate-500">
                      {usage.charactersRemaining.toLocaleString()} characters remaining this month
                    </p>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <p className="text-2xl font-bold text-white">{usage.charactersUsed.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Characters used</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/50 p-4">
                    <p className="text-2xl font-bold text-white">
                      {usage.isUnlimited ? '∞' : usage.charactersRemaining.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-400">Remaining</p>
                  </div>
                </div>

                {/* Usage percentage */}
                {!usage.isUnlimited && (
                  <div className="flex items-center justify-center pt-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          className="text-slate-700"
                          strokeWidth="8"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="64"
                          cy="64"
                        />
                        <circle
                          className={`${
                            usage.percentUsed >= 90 ? 'text-red-500' : usage.percentUsed >= 70 ? 'text-amber-500' : 'text-green-500'
                          }`}
                          strokeWidth="8"
                          strokeDasharray={`${usage.percentUsed * 3.52} 352`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="64"
                          cy="64"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{Math.round(usage.percentUsed)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plan info */}
                <div className="text-center pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400">
                    Plan resets on the 1st of each month
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
