export interface SmsSendParams {
  to: string;
  from: string;
  body: string;
}

export interface SmsSendResult {
  messageId: string;
  status: 'sent' | 'failed';
  provider: string;
}

export interface SmsProvider {
  sendSms(params: SmsSendParams): Promise<SmsSendResult>;
}

/**
 * Legitimate Development/Mock Provider Adapter for SMS.
 * Simulates sending SMS messages.
 */
export class MockSmsProvider implements SmsProvider {
  async sendSms(params: SmsSendParams): Promise<SmsSendResult> {
    console.log(`[MockSMS] Sending to ${params.to} from ${params.from}: ${params.body}`);
    return {
      messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'sent',
      provider: 'mock',
    };
  }
}

// Singleton SMS Provider Resolver
export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER || 'mock';
  switch (provider) {
    case 'mock':
    default: return new MockSmsProvider();
  }
}
