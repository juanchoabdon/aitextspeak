/**
 * Amplitude Server-Side Tracking Tests
 * 
 * Tests revenue and event tracking for webhooks
 */

// Mock the amplitude module before any imports
jest.mock('@amplitude/analytics-node', () => ({
  init: jest.fn(),
  track: jest.fn(),
  revenue: jest.fn(),
  identify: jest.fn(),
  flush: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
  Identify: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockReturnThis(),
  })),
  Revenue: jest.fn().mockImplementation(() => ({
    setProductId: jest.fn().mockReturnThis(),
    setPrice: jest.fn().mockReturnThis(),
    setQuantity: jest.fn().mockReturnThis(),
    setRevenueType: jest.fn().mockReturnThis(),
    setEventProperties: jest.fn().mockReturnThis(),
  })),
  Types: {
    ServerZone: { EU: 'EU' },
    LogLevel: { Warn: 'warn' },
  },
}));

describe('Amplitude Server Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export all tracking functions', async () => {
      const amplitudeServer = await import('@/lib/analytics/amplitude-server');
      
      expect(amplitudeServer.trackServerEvent).toBeDefined();
      expect(amplitudeServer.trackServerRevenue).toBeDefined();
      expect(amplitudeServer.trackPaymentCompleted).toBeDefined();
      expect(amplitudeServer.trackSubscriptionActivatedServer).toBeDefined();
      expect(amplitudeServer.trackSubscriptionRenewalServer).toBeDefined();
      expect(amplitudeServer.trackSubscriptionCancelledServer).toBeDefined();
      expect(amplitudeServer.trackPaymentFailedServer).toBeDefined();
      expect(amplitudeServer.flushAmplitude).toBeDefined();
    });
  });

  describe('trackSubscriptionRenewalServer', () => {
    it('should be callable with correct parameters', async () => {
      const { trackSubscriptionRenewalServer } = await import('@/lib/analytics/amplitude-server');
      
      // Should not throw
      expect(() => {
        trackSubscriptionRenewalServer('user-123', {
          planId: 'basic_monthly',
          amount: 9.99,
          provider: 'paypal_legacy',
          currency: 'USD',
          subscriptionId: 'I-ABC123',
        });
      }).not.toThrow();
    });

    it('should accept stripe provider', async () => {
      const { trackSubscriptionRenewalServer } = await import('@/lib/analytics/amplitude-server');
      
      expect(() => {
        trackSubscriptionRenewalServer('user-456', {
          planId: 'pro_monthly',
          amount: 29.99,
          provider: 'stripe',
          currency: 'USD',
        });
      }).not.toThrow();
    });

    it('should accept paypal provider', async () => {
      const { trackSubscriptionRenewalServer } = await import('@/lib/analytics/amplitude-server');
      
      expect(() => {
        trackSubscriptionRenewalServer('user-789', {
          planId: 'basic_monthly',
          amount: 9.99,
          provider: 'paypal',
          currency: 'USD',
        });
      }).not.toThrow();
    });
  });

  describe('trackPaymentCompleted', () => {
    it('should be callable for new subscriptions', async () => {
      const { trackPaymentCompleted } = await import('@/lib/analytics/amplitude-server');
      
      expect(() => {
        trackPaymentCompleted('user-123', {
          planId: 'basic_monthly',
          amount: 9.99,
          provider: 'stripe',
          isRecurring: true,
          currency: 'USD',
          subscriptionId: 'sub_123',
        });
      }).not.toThrow();
    });

    it('should be callable for lifetime purchases', async () => {
      const { trackPaymentCompleted } = await import('@/lib/analytics/amplitude-server');
      
      expect(() => {
        trackPaymentCompleted('user-123', {
          planId: 'lifetime',
          amount: 99.00,
          provider: 'paypal',
          isRecurring: false,
          currency: 'USD',
        });
      }).not.toThrow();
    });
  });

  describe('flushAmplitude', () => {
    it('should be callable', async () => {
      const { flushAmplitude } = await import('@/lib/analytics/amplitude-server');
      
      await expect(flushAmplitude()).resolves.not.toThrow();
    });
  });
});

describe('Provider Support', () => {
  const providers: Array<'stripe' | 'paypal' | 'paypal_legacy'> = ['stripe', 'paypal', 'paypal_legacy'];
  
  providers.forEach(provider => {
    it(`should support ${provider} provider`, async () => {
      const { trackSubscriptionRenewalServer } = await import('@/lib/analytics/amplitude-server');
      
      expect(() => {
        trackSubscriptionRenewalServer('user-test', {
          planId: 'test_plan',
          amount: 9.99,
          provider,
          currency: 'USD',
        });
      }).not.toThrow();
    });
  });
});
