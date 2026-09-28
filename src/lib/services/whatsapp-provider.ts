export interface WhatsAppSendParams {
  to: string;
  content: string;
  templateId?: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  status: 'sent' | 'failed';
  provider: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
}

export interface WhatsAppProvider {
  sendMessage(params: WhatsAppSendParams): Promise<WhatsAppSendResult>;
  getMessages(conversationId: string): Promise<WhatsAppMessage[]>;
}

/**
 * Legitimate Development/Mock Provider Adapter for WhatsApp.
 * Simulates WhatsApp messaging.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
    console.log(`[MockWhatsApp] Sending to ${params.to}: ${params.content}`);
    return {
      messageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'sent',
      provider: 'mock',
    };
  }

  async getMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    return [
      {
        id: `wa_msg_${Date.now()}`,
        from: '+1234567890',
        content: '[MOCK — Development AI] Hello, is this item available?',
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: `wa_msg_${Date.now() + 1}`,
        from: 'system',
        content: '[MOCK — Development AI] Yes, it is! How can we help?',
        timestamp: new Date(),
      }
    ];
  }
}

// Singleton WhatsApp Provider Resolver
export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';
  switch (provider) {
    case 'mock':
    default: return new MockWhatsAppProvider();
  }
}
