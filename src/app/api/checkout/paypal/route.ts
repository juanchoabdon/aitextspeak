import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPayPalSubscription, createPayPalOrder } from '@/lib/payments/paypal';
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Handle Lifetime package (one-time payment)
    if (planId === 'lifetime') {
      const result = await createPayPalOrder({
        userId: user.id,
        amount: plan.price,
        itemName: plan.name,
        successUrl: `${baseUrl}/api/checkout/paypal/capture?user_id=${user.id}`,
        cancelUrl: `${baseUrl}/pricing?canceled=true`,
      });

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: result.approvalUrl });
    }

    // Handle subscription plans
    if (!plan.paypalPlanId) {
      return NextResponse.json(
        { error: 'This plan is not available for PayPal' },
        { status: 400 }
      );
    }

    const result = await createPayPalSubscription({
      userId: user.id,
      email: user.email!,
      planId,
      paypalPlanId: plan.paypalPlanId,
      // Pass subscription_id so we can verify and activate on redirect
      successUrl: `${baseUrl}/api/checkout/paypal/subscription-callback?user_id=${user.id}&plan_id=${planId}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: result.approvalUrl });
  } catch (error) {
    console.error('PayPal checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
