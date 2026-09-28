export interface EmailSendParams {
  to: string;
  from: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

export interface EmailSendResult {
  messageId: string;
  status: 'sent' | 'failed';
  provider: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
}

export interface EmailThreadResult {
  messages: EmailMessage[];
}

export interface EmailProvider {
  sendEmail(params: EmailSendParams): Promise<EmailSendResult>;
  getThread(threadId: string): Promise<EmailThreadResult | null>;
}

/**
 * Legitimate Development/Mock Provider Adapter for Email.
 * Simulates sending and retrieving emails.
 */
export class MockEmailProvider implements EmailProvider {
  async sendEmail(params: EmailSendParams): Promise<EmailSendResult> {
    console.log(`[MockEmail] Sending to ${params.to} from ${params.from} (Subject: ${params.subject})`);
    return {
      messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'sent',
      provider: 'mock',
    };
  }

  async getThread(threadId: string): Promise<EmailThreadResult | null> {
    return {
      messages: [
        {
          id: `msg_${Date.now()}`,
          from: 'customer@example.com',
          to: 'sales@company.com',
          subject: 'Re: Inquiry',
          body: '[MOCK — Development AI] I would like to know more about your pricing.',
          date: new Date(Date.now() - 3600000),
        },
        {
          id: `msg_${Date.now() + 1}`,
          from: 'sales@company.com',
          to: 'customer@example.com',
          subject: 'Re: Inquiry',
          body: '[MOCK — Development AI] Sure, I can help with that.',
          date: new Date(),
        }
      ],
    };
  }
}

// Singleton Email Provider Resolver
export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  switch (provider) {
    case 'mock':
    default: return new MockEmailProvider();
  }
}
