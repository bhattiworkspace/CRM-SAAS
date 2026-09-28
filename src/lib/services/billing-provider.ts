export interface SubscriptionParams {
  organizationId: string;
  planId: string;
  externalCustomerId?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  provider: string;
}

export interface CancelSubscriptionResult {
  status: string;
}

export interface WebhookResult {
  event: string;
  organizationId?: string;
  processed: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  status: string;
  date: Date;
}

export interface BillingProvider {
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<CancelSubscriptionResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
  getPaymentHistory(organizationId: string): Promise<PaymentHistoryItem[]>;
}

/**
 * Legitimate Development/Local Provider Adapter for Billing.
 * Simulates Stripe/Braintree functionality locally without external calls.
 */
export class LocalBillingProvider implements BillingProvider {
  async createSubscription(params: SubscriptionParams): Promise<SubscriptionResult> {
    console.log(`[LocalBilling] Creating subscription for org: ${params.organizationId}, plan: ${params.planId}`);
    return {
      subscriptionId: `sub_local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'active',
      provider: 'local',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<CancelSubscriptionResult> {
    console.log(`[LocalBilling] Canceling subscription: ${subscriptionId}`);
    return {
      status: 'canceled',
    };
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    console.log(`[LocalBilling] Handling webhook, signature: ${signature}`);
    return {
      event: 'mock.event.received',
      processed: true,
    };
  }

  async getPaymentHistory(organizationId: string): Promise<PaymentHistoryItem[]> {
    return [
      {
        id: `pi_local_${Date.now()}`,
        amount: 9900, // $99.00
        status: 'succeeded',
        date: new Date(Date.now() - 30 * 24 * 3600000),
      },
      {
        id: `pi_local_${Date.now() + 1}`,
        amount: 9900,
        status: 'succeeded',
        date: new Date(),
      }
    ];
  }
}

// Singleton Billing Provider Resolver
export function getBillingProvider(): BillingProvider {
  const provider = process.env.BILLING_PROVIDER || 'local';
  switch (provider) {
    case 'local':
    default: return new LocalBillingProvider();
  }
}
