// Jest setup file
import '@testing-library/jest-dom';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.PAYPAL_CLIENT_ID = 'test-client-id';
process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
process.env.PAYPAL_LEGACY_CLIENT_ID = 'test-legacy-client-id';
process.env.PAYPAL_LEGACY_CLIENT_SECRET = 'test-legacy-client-secret';
process.env.BREVO_API_KEY = 'test-brevo-key';
process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = 'test-amplitude-key';

// Global fetch mock
global.fetch = jest.fn();

// Console spy to check logs
beforeEach(() => {
  jest.clearAllMocks();
});

