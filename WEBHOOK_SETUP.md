# Webhook Configuration Guide

This guide explains how to configure webhooks for Stripe and PayPal in your production environment.

## Prerequisites

- Your production URL (e.g., `https://aitextspeak.com`)
- Access to Stripe Dashboard
- Access to PayPal Developer Dashboard
- Environment variables configured in your hosting platform (Vercel, etc.)

---

## Stripe Webhook Configuration

### Step 1: Create Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://aitextspeak.com/webhook/stripe
   ```
4. Select the following events to listen for:
   - ✅ `checkout.session.completed` - When a customer completes checkout (subscription or one-time)
   - ✅ `customer.subscription.updated` - When subscription status changes
   - ✅ `customer.subscription.deleted` - When subscription is cancelled
   - ✅ `customer.subscription.paused` - When subscription is paused
   - ✅ `customer.subscription.resumed` - When subscription is resumed
   - ✅ `invoice.paid` - When an invoice payment succeeds
   - ✅ `invoice.payment_failed` - When a subscription payment fails

### Step 2: Get Webhook Signing Secret

1. After creating the webhook, click on it to view details
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the secret (starts with `whsec_...`)
4. Add it to your environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Step 3: Test the Webhook (Optional)

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select `checkout.session.completed` event
4. Verify your application receives and processes it correctly

### Step 4: Verify in Production

- Test a real checkout flow
- Check your application logs to confirm webhook events are received
- Verify subscriptions are created in your database

---

## PayPal Webhook Configuration

### Step 1: Create Webhook in PayPal Developer Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Select your app (or create one if needed)
3. Navigate to **"Webhooks"** section
4. Click **"Add webhook"**

### Step 2: Configure Webhook URL

1. Enter your webhook URL:
   ```
   https://aitextspeak.com/webhook/paypal
   ```
2. Select the following event types:
   - ✅ `BILLING.SUBSCRIPTION.ACTIVATED` - When subscription is activated
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED` - When subscription is cancelled
   - ✅ `BILLING.SUBSCRIPTION.SUSPENDED` - When subscription is suspended
   - ✅ `BILLING.SUBSCRIPTION.EXPIRED` - When subscription expires
   - ✅ `BILLING.SUBSCRIPTION.RENEWED` - When subscription renews
   - ✅ `PAYMENT.SALE.COMPLETED` - When a payment is completed
   - ✅ `PAYMENT.CAPTURE.COMPLETED` - When a payment capture completes (for one-time payments)

### Step 3: Get Webhook ID

1. After creating the webhook, you'll see a **Webhook ID** (looks like a UUID)
2. Copy this ID
3. Add it to your environment variables:
   ```
   PAYPAL_WEBHOOK_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### Step 4: Verify Webhook Configuration

1. PayPal will automatically verify your webhook endpoint
2. Check the webhook status in PayPal Dashboard (should show as "Active")
3. If verification fails, check:
   - Your endpoint is publicly accessible
   - Your endpoint returns 200 status for GET requests (if required)
   - SSL certificate is valid

### Step 5: Test the Webhook

1. In PayPal Dashboard → Webhooks → Your webhook
2. Click **"Send test event"**
3. Select an event type (e.g., `BILLING.SUBSCRIPTION.ACTIVATED`)
4. Verify your application receives and processes it correctly

---

## Environment Variables Summary

Add these to your production environment (Vercel, etc.):

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxx
PAYPAL_WEBHOOK_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PAYPAL_MODE=live  # or 'sandbox' for testing
```

---

## Webhook Endpoints

Your application has the following webhook endpoints:

- **Stripe**: `POST https://aitextspeak.com/webhook/stripe`
- **PayPal**: `POST https://aitextspeak.com/webhook/paypal`

Both endpoints:
- Verify webhook signatures for security
- Handle subscription lifecycle events
- Update your database automatically
- Track payments in `payment_history` table
- Update user roles and subscriptions

---

## Troubleshooting

### Stripe Webhooks Not Working

1. **404 ERR errors**: 
   - Ensure the webhook URL in Stripe Dashboard is exactly: `https://aitextspeak.com/webhook/stripe` (no trailing slash)
   - Check that the route file exists at `src/app/webhook/stripe/route.ts`
   - Verify the middleware is not blocking webhook routes (should be excluded)

2. **307 ERR errors**:
   - Usually indicates a redirect issue
   - Ensure you're using HTTPS (not HTTP) in the webhook URL
   - Check for trailing slashes or incorrect URL format
   - Verify no redirect rules in your hosting platform (Vercel, etc.)

3. **Check webhook secret**: Ensure `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
4. **Check logs**: Look for webhook errors in your application logs
5. **Test endpoint**: Use Stripe CLI to test locally: `stripe listen --forward-to localhost:3000/webhook/stripe`
6. **Verify signature**: Stripe webhooks require the `stripe-signature` header
7. **Middleware interference**: Webhook routes should bypass authentication middleware (already configured)

### PayPal Webhooks Not Working

1. **Check webhook ID**: Ensure `PAYPAL_WEBHOOK_ID` matches the one in PayPal Dashboard
2. **Check verification**: PayPal webhooks must pass signature verification
3. **Check logs**: Look for webhook errors in your application logs
4. **Verify endpoint**: Ensure your endpoint is publicly accessible and returns proper responses

### Common Issues

- **404 errors**: Ensure webhook URLs are correct and routes exist
- **401/403 errors**: Check webhook secrets/IDs are correct
- **Timeout errors**: Ensure your endpoint responds quickly (< 30 seconds)
- **Duplicate events**: Your code should handle idempotency (already handled in the codebase)

---

## Testing Webhooks Locally

### Stripe CLI (Recommended)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhook/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

### PayPal (Use Sandbox)

1. Set `PAYPAL_MODE=sandbox` in `.env.local`
2. Create webhook in PayPal Sandbox
3. Test with sandbox transactions

---

## Security Notes

- ✅ Webhook signatures are verified for both Stripe and PayPal
- ✅ Never expose webhook secrets in client-side code
- ✅ Use HTTPS in production (required by both platforms)
- ✅ Webhook endpoints don't require authentication (signature verification is sufficient)
- ✅ Always validate webhook payloads before processing

---

## Next Steps

1. Configure webhooks in both Stripe and PayPal dashboards
2. Add environment variables to your production hosting
3. Test with a real transaction
4. Monitor webhook logs for any issues
5. Set up alerts for failed webhook deliveries (optional)

