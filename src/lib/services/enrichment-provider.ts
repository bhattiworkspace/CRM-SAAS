export interface BusinessEnrichmentProvider {
  enrichCompany(domain: string): Promise<{ name?: string; industry?: string; employees?: string; revenue?: string; description?: string; founded?: string; provider: string; enrichedAt: Date }>;
  enrichContact(email: string): Promise<{ firstName?: string; lastName?: string; title?: string; company?: string; linkedIn?: string; provider: string; enrichedAt: Date }>;
}

export class MockEnrichmentProvider implements BusinessEnrichmentProvider {
  async enrichCompany(domain: string) {
    return {
      name: `${domain.split('.')[0].toUpperCase()} [MOCK]`,
      industry: 'Software',
      employees: '100-500',
      description: '[MOCK — Development AI] This is a mock company description.',
      provider: 'mock',
      enrichedAt: new Date()
    };
  }

  async enrichContact(email: string) {
    return {
      firstName: 'Mock',
      lastName: 'Contact',
      title: 'Engineer',
      provider: 'mock',
      enrichedAt: new Date()
    };
  }
}

export function getEnrichmentProvider(): BusinessEnrichmentProvider {
  const provider = process.env.ENRICHMENT_PROVIDER || 'mock';
  switch (provider) {
    case 'mock':
    default: return new MockEnrichmentProvider();
  }
}
