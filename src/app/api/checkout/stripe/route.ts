import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { PLANS, type PlanId } from '@/lib/payments/plans';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = await request.json() as { planId: PlanId };

    if (!planId || !PLANS[planId]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const plan = PLANS[planId];

    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: 'This plan is not available for Stripe checkout' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      priceId: plan.stripePriceId,
      planId,
      successUrl: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    });

    if (result.error || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}









