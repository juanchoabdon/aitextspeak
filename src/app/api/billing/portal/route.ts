import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPortalSession, stripe } from '@/lib/payments/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's Stripe subscription
    const adminClient = createAdminClient();
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('provider_customer_id, provider_subscription_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No Stripe subscription found' },
        { status: 404 }
      );
    }

    let customerId = subscription.provider_customer_id;

    // If we don't have a customer ID but have a subscription ID, look it up from Stripe
    if (!customerId && subscription.provider_subscription_id) {
      try {
        // Check if it's a subscription ID (starts with sub_)
        if (subscription.provider_subscription_id.startsWith('sub_')) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.provider_subscription_id
          );
          customerId = stripeSubscription.customer as string;
          
          // Save the customer ID for future use
          await adminClient
            .from('subscriptions')
            .update({ provider_customer_id: customerId })
            .eq('user_id', user.id)
            .eq('provider', 'stripe');
        }
      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Could not find Stripe customer. Please contact support.' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const result = await createPortalSession({
      customerId,
      returnUrl: `${baseUrl}/dashboard/billing`,
    });

    if (result.error || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to create portal session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



