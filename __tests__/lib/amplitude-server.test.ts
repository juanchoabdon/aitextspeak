/**
 * Amplitude Server-Side Tracking Tests
 * 
 * Tests revenue and event tracking for webhooks
 * Verifies that amplitude.track() is called with correct format
 */

// Set up env var before any imports
process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = 'test-api-key';

// Mock the amplitude module
const mockTrack = jest.fn();
const mockRevenue = jest.fn();
const mockIdentify = jest.fn();
const mockFlush = jest.fn().mockReturnValue({ promise: Promise.resolve() });

jest.mock('@amplitude/analytics-node', () => ({
  init: jest.fn(),
  track: mockTrack,
  revenue: mockRevenue,
  identify: mockIdentify,
  flush: mockFlush,
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

// Import after mocking
import {
  trackServerEvent,
  trackServerRevenue,
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  trackSubscriptionRenewalServer,
  trackSubscriptionCancelledServer,
  trackPaymentFailedServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

describe('Amplitude Server Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackServerEvent', () => {
    it('should call amplitude.track with correct 3-arg format', () => {
      trackServerEvent('user-123', 'Test Event', {
        plan_id: 'monthly',
        amount: 9.99,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Test Event',
        { plan_id: 'monthly', amount: 9.99 },
        { user_id: 'user-123' }
      );
    });

    it('should clean properties - remove null and undefined', () => {
      trackServerEvent('user-123', 'Test Event', {
        stringProp: 'hello',
        numberProp: 42,
        boolProp: true,
        nullProp: null,
        undefinedProp: undefined,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Test Event',
        { stringProp: 'hello', numberProp: 42, boolProp: true },
        { user_id: 'user-123' }
      );
    });

    it('should handle empty properties', () => {
      trackServerEvent('user-123', 'Test Event', {});

      expect(mockTrack).toHaveBeenCalledWith(
        'Test Event',
        {},
        { user_id: 'user-123' }
      );
    });
  });

  describe('trackPaymentCompleted', () => {
    it('should track Revenue event for subscriptions', () => {
      trackPaymentCompleted('user-123', {
        planId: 'monthly',
        amount: 9.99,
        provider: 'stripe',
        isRecurring: true,
        currency: 'USD',
        subscriptionId: 'sub_123',
      });

      // Should call amplitude.revenue
      expect(mockRevenue).toHaveBeenCalled();

      // Should call amplitude.track for 'Revenue' event
      expect(mockTrack).toHaveBeenCalledWith(
        'Revenue',
        expect.objectContaining({
          $revenue: 9.99,
          $price: 9.99,
          $productId: 'monthly',
        }),
        { user_id: 'user-123' }
      );
    });

    it('should track Subscription Started for recurring payments', () => {
      trackPaymentCompleted('user-123', {
        planId: 'monthly',
        amount: 9.99,
        provider: 'stripe',
        isRecurring: true,
        currency: 'USD',
        subscriptionId: 'sub_123',
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Subscription Started',
        expect.objectContaining({
          plan_id: 'monthly',
          amount: 9.99,
          payment_provider: 'stripe',
        }),
        { user_id: 'user-123' }
      );
    });

    it('should track Payment Completed for all payments', () => {
      trackPaymentCompleted('user-123', {
        planId: 'monthly',
        amount: 9.99,
        provider: 'stripe',
        isRecurring: true,
        currency: 'USD',
        subscriptionId: 'sub_123',
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Payment Completed',
        expect.objectContaining({
          plan_id: 'monthly',
          amount: 9.99,
          is_recurring: true,
        }),
        { user_id: 'user-123' }
      );
    });

    it('should track Lifetime Purchased for lifetime plans', () => {
      trackPaymentCompleted('user-123', {
        planId: 'lifetime',
        amount: 99.00,
        provider: 'paypal',
        isRecurring: false,
        currency: 'USD',
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Lifetime Purchased',
        expect.objectContaining({
          amount: 99.00,
          payment_provider: 'paypal',
        }),
        { user_id: 'user-123' }
      );
    });

    it('should NOT track Subscription Started for lifetime', () => {
      mockTrack.mockClear();
      
      trackPaymentCompleted('user-123', {
        planId: 'lifetime',
        amount: 99.00,
        provider: 'paypal',
        isRecurring: false,
        currency: 'USD',
      });

      // Should NOT have called with 'Subscription Started'
      const subscriptionStartedCalls = mockTrack.mock.calls.filter(
        call => call[0] === 'Subscription Started'
      );
      expect(subscriptionStartedCalls).toHaveLength(0);
    });
  });

  describe('trackSubscriptionRenewalServer', () => {
    it('should track revenue and Subscription Renewed event', () => {
      trackSubscriptionRenewalServer('user-123', {
        planId: 'monthly',
        amount: 9.99,
        provider: 'paypal_legacy',
        currency: 'USD',
        subscriptionId: 'I-ABC123',
      });

      expect(mockRevenue).toHaveBeenCalled();

      expect(mockTrack).toHaveBeenCalledWith(
        'Subscription Renewed',
        expect.objectContaining({
          plan_id: 'monthly',
          amount: 9.99,
          payment_provider: 'paypal_legacy',
        }),
        { user_id: 'user-123' }
      );
    });
  });

  describe('trackSubscriptionCancelledServer', () => {
    it('should track Subscription Cancelled event with reason', () => {
      trackSubscriptionCancelledServer('user-123', {
        planId: 'monthly',
        provider: 'stripe',
        subscriptionId: 'sub_123',
        reason: 'user_cancelled',
        amount: 9.99,
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Subscription Cancelled',
        expect.objectContaining({
          plan_id: 'monthly',
          cancellation_reason: 'user_cancelled',
        }),
        { user_id: 'user-123' }
      );
    });

    it('should track negative revenue for churn', () => {
      trackSubscriptionCancelledServer('user-123', {
        planId: 'monthly',
        provider: 'stripe',
        subscriptionId: 'sub_123',
        amount: 9.99,
      });

      // Should call revenue with negative amount
      expect(mockRevenue).toHaveBeenCalled();
    });
  });

  describe('trackPaymentFailedServer', () => {
    it('should track Payment Failed event WITHOUT revenue', () => {
      mockTrack.mockClear();
      mockRevenue.mockClear();
      
      trackPaymentFailedServer('user-123', {
        planId: 'monthly',
        provider: 'stripe',
        amount: 9.99,
        errorMessage: 'Card declined',
      });

      // Should NOT call amplitude.revenue for failed payments
      expect(mockRevenue).not.toHaveBeenCalled();

      // Should track the event with amount_attempted (not revenue)
      expect(mockTrack).toHaveBeenCalledWith(
        'Payment Failed',
        expect.objectContaining({
          plan_id: 'monthly',
          amount_attempted: 9.99,
          error_message: 'Card declined',
        }),
        { user_id: 'user-123' }
      );
    });
  });

  describe('trackSubscriptionActivatedServer', () => {
    it('should track Subscription Activated event', () => {
      trackSubscriptionActivatedServer('user-123', {
        planId: 'monthly',
        provider: 'stripe',
        subscriptionId: 'sub_123',
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Subscription Activated',
        expect.objectContaining({
          plan_id: 'monthly',
          payment_provider: 'stripe',
          subscription_id: 'sub_123',
        }),
        { user_id: 'user-123' }
      );
    });
  });

  describe('flushAmplitude', () => {
    it('should call amplitude.flush', async () => {
      await flushAmplitude();

      expect(mockFlush).toHaveBeenCalled();
    });
  });
});

describe('Provider Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const providers: Array<'stripe' | 'paypal' | 'paypal_legacy'> = ['stripe', 'paypal', 'paypal_legacy'];
  
  providers.forEach(provider => {
    it(`should track events with ${provider} provider`, () => {
      trackSubscriptionRenewalServer('user-test', {
        planId: 'test_plan',
        amount: 9.99,
        provider,
        currency: 'USD',
      });

      expect(mockTrack).toHaveBeenCalledWith(
        'Subscription Renewed',
        expect.objectContaining({
          payment_provider: provider,
        }),
        expect.any(Object)
      );
    });
  });
});
