/**
 * Script to create Lifetime Package product and price in Stripe
 * Run with: npx tsx scripts/create-lifetime-product.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createLifetimeProduct() {
  console.log('Creating Lifetime Package product in Stripe...\n');

  try {
    // Create the product
    const product = await stripe.products.create({
      name: 'Lifetime Package',
      description: 'One-time payment for lifetime access to AI TextSpeak. Includes unlimited characters, all voices, and commercial rights.',
      metadata: {
        plan_id: 'lifetime',
      },
    });

    console.log('✅ Product created:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Name: ${product.name}\n`);

    // Create the price (one-time, $99 USD)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 9900, // $99.00 in cents
      currency: 'usd',
      metadata: {
        plan_id: 'lifetime',
      },
    });

    console.log('✅ Price created:');
    console.log(`   Price ID: ${price.id}`);
    console.log(`   Amount: $${(price.unit_amount! / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
    console.log(`   Type: One-time payment\n`);

    console.log('='.repeat(50));
    console.log('\n📋 Add this to your .env.local:\n');
    console.log(`STRIPE_PRICE_LIFETIME=${price.id}`);
    console.log('\n' + '='.repeat(50));

    return { product, price };
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
}

createLifetimeProduct()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });



