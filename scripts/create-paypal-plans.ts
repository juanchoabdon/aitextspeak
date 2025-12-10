/**
 * Script to create PayPal Products and Subscription Plans
 * 
 * Run with: npx tsx scripts/create-paypal-plans.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createProduct(accessToken: string): Promise<string> {
  console.log('\n📦 Creating Product...');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `product-aitextspeak-${Date.now()}`,
    },
    body: JSON.stringify({
      name: 'AI TextSpeak Subscription',
      description: 'Text-to-Speech subscription service with premium voices',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error creating product:', error);
    throw new Error('Failed to create product');
  }

  const product = await response.json();
  console.log('✅ Product created:', product.id);
  return product.id;
}

async function createPlan(
  accessToken: string,
  productId: string,
  planDetails: {
    name: string;
    description: string;
    price: number;
    interval: 'MONTH' | 'YEAR';
  }
): Promise<string> {
  console.log(`\n📋 Creating Plan: ${planDetails.name}...`);

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `plan-${planDetails.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: planDetails.name,
      description: planDetails.description,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: planDetails.interval,
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: planDetails.price.toString(),
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error creating plan:', error);
    throw new Error(`Failed to create plan: ${planDetails.name}`);
  }

  const plan = await response.json();
  console.log(`✅ Plan created: ${plan.id}`);
  return plan.id;
}

async function main() {
  console.log('🚀 PayPal Plan Creation Script');
  console.log('================================');
  console.log(`Mode: ${process.env.PAYPAL_MODE || 'sandbox'}`);
  console.log(`API Base: ${PAYPAL_API_BASE}`);

  try {
    // Get access token
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    // Create product
    const productId = await createProduct(accessToken);

    // Create Monthly Plan ($9.99/month)
    const monthlyPlanId = await createPlan(accessToken, productId, {
      name: 'AI TextSpeak Monthly',
      description: '100,000 characters per month, all languages and voices',
      price: 9.99,
      interval: 'MONTH',
    });

    // Create Monthly Pro Plan ($29.99/month)
    const monthlyProPlanId = await createPlan(accessToken, productId, {
      name: 'AI TextSpeak Monthly Pro',
      description: 'Unlimited characters per month, all languages and voices, priority support',
      price: 29.99,
      interval: 'MONTH',
    });

    console.log('\n================================');
    console.log('🎉 All plans created successfully!');
    console.log('================================\n');
    console.log('Add these to your .env.local:\n');
    console.log(`PAYPAL_PLAN_MONTHLY=${monthlyPlanId}`);
    console.log(`PAYPAL_PLAN_MONTHLY_PRO=${monthlyProPlanId}`);
    console.log(`\nProduct ID (for reference): ${productId}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

