/**
 * Brevo Email Service Tests
 * 
 * Tests email sending with retry logic for transient errors
 */

describe('Brevo Email Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('sendEmail', () => {
    it('should successfully send email on first attempt', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageId: 'msg-123' }),
        headers: { get: () => 'application/json' },
      });
      global.fetch = mockFetch;

      // Import fresh module
      jest.resetModules();
      const { sendEmail } = await import('@/lib/email/brevo');

      const result = await sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on ECONNRESET error', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('fetch failed: ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messageId: 'msg-123' }),
          headers: { get: () => 'application/json' },
        });
      global.fetch = mockFetch;

      jest.resetModules();
      const { sendEmail } = await import('@/lib/email/brevo');

      const result = await sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValue(new Error('fetch failed: ECONNRESET'));
      global.fetch = mockFetch;

      jest.resetModules();
      const { sendEmail } = await import('@/lib/email/brevo');

      const result = await sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 3 retry attempts
    });

    it('should not retry on non-transient errors', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValue(new Error('Invalid API key'));
      global.fetch = mockFetch;

      jest.resetModules();
      const { sendEmail } = await import('@/lib/email/brevo');

      const result = await sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('sendPaymentNotification', () => {
    it('should send renewal notification', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageId: 'msg-123' }),
        headers: { get: () => 'application/json' },
      });
      global.fetch = mockFetch;

      jest.resetModules();
      const { sendPaymentNotification } = await import('@/lib/email/brevo');

      const result = await sendPaymentNotification({
        type: 'renewal',
        userEmail: 'user@example.com',
        amount: 9.99,
        currency: 'USD',
        provider: 'paypal_legacy',
        planName: 'Basic Plan',
        subscriptionId: 'I-ABC123',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      
      // Check that correct recipients are used
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.to).toContainEqual(expect.objectContaining({ email: 'yes-ame100@gmail.com' }));
      expect(body.to).toContainEqual(expect.objectContaining({ email: 'juanchoabdons@gmail.com' }));
    });

    it('should include correct payment details in email', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageId: 'msg-123' }),
        headers: { get: () => 'application/json' },
      });
      global.fetch = mockFetch;

      jest.resetModules();
      const { sendPaymentNotification } = await import('@/lib/email/brevo');

      await sendPaymentNotification({
        type: 'new_subscription',
        userEmail: 'newuser@example.com',
        amount: 29.99,
        currency: 'USD',
        provider: 'stripe',
        planName: 'Pro Plan',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.subject).toContain('New Subscription');
      expect(body.htmlContent).toContain('newuser@example.com');
      expect(body.htmlContent).toContain('$29.99');
      expect(body.htmlContent.toLowerCase()).toContain('stripe');
    });
  });
});

