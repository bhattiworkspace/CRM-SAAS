export interface BusinessSearchParams {
  query: string;
  category?: string;
  location?: string;
  limit?: number;
}

export interface BusinessItem {
  providerId: string;
  name: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  providerUrl?: string;
}

export interface BusinessSearchResponse {
  businesses: BusinessItem[];
  totalResults: number;
  providerName: string;
}

export interface BusinessSearchProvider {
  searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResponse>;
  getBusinessDetails(providerId: string): Promise<BusinessItem | null>;
}

/**
 * Legitimate Development/Mock Provider Adapter for Business Search.
 * Simulates real structured B2B provider API results without HTML scraping.
 */
export class MockBusinessSearchProvider implements BusinessSearchProvider {
  private sampleDatabase: BusinessItem[] = [
    {
      providerId: 'biz_001',
      name: 'Apex Technology Solutions',
      category: 'Software & IT Consulting',
      phone: '+1 (555) 234-5678',
      address: '100 Innovation Way, Suite 400, Austin, TX 78701',
      website: 'https://apextech.example.com',
      rating: 4.8,
      reviewCount: 42,
      latitude: 30.2672,
      longitude: -97.7431,
      providerUrl: 'https://maps.example.com/place/apextech',
    },
    {
      providerId: 'biz_002',
      name: 'Vanguard Medical Devices',
      category: 'Healthcare & Biotechnology',
      phone: '+1 (555) 876-5432',
      address: '550 Health Parkway, Boston, MA 02118',
      website: 'https://vanguardmed.example.com',
      rating: 4.6,
      reviewCount: 29,
      latitude: 42.3601,
      longitude: -71.0589,
      providerUrl: 'https://maps.example.com/place/vanguardmed',
    },
    {
      providerId: 'biz_003',
      name: 'BlueSky Logistics & Transport',
      category: 'Freight & Supply Chain',
      phone: '+1 (555) 345-6789',
      address: '1200 Logistics Center Blvd, Chicago, IL 60607',
      website: 'https://blueskylogistics.example.com',
      rating: 4.4,
      reviewCount: 18,
      latitude: 41.8781,
      longitude: -87.6298,
      providerUrl: 'https://maps.example.com/place/bluesky',
    },
    {
      providerId: 'biz_004',
      name: 'Horizon Green Energy Corp',
      category: 'Renewables & CleanTech',
      phone: '+1 (555) 987-6543',
      address: '750 Solar Ridge Road, Denver, CO 80202',
      website: 'https://horizongreen.example.com',
      rating: 4.9,
      reviewCount: 65,
      latitude: 39.7392,
      longitude: -104.9903,
      providerUrl: 'https://maps.example.com/place/horizongreen',
    },
    {
      providerId: 'biz_005',
      name: 'Summit Financial Advisors',
      category: 'Wealth Management & Financial Services',
      phone: '+1 (555) 456-7890',
      address: '40 Wall Street, 28th Floor, New York, NY 10005',
      website: 'https://summitfinancial.example.com',
      rating: 4.7,
      reviewCount: 38,
      latitude: 40.7075,
      longitude: -74.0089,
      providerUrl: 'https://maps.example.com/place/summitfinancial',
    },
    {
      providerId: 'biz_006',
      name: 'Nexus Digital Marketing Agency',
      category: 'Marketing & Advertising',
      phone: '+1 (555) 654-3210',
      address: '320 Market Street, San Francisco, CA 94105',
      website: 'https://nexusdigital.example.com',
      rating: 4.5,
      reviewCount: 51,
      latitude: 37.7749,
      longitude: -122.4194,
      providerUrl: 'https://maps.example.com/place/nexusdigital',
    },
  ];

  async searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResponse> {
    const queryLower = params.query.toLowerCase();
    const locationLower = (params.location || '').toLowerCase();
    const categoryLower = (params.category || '').toLowerCase();

    let filtered = this.sampleDatabase.filter((biz) => {
      const matchQuery =
        !queryLower ||
        biz.name.toLowerCase().includes(queryLower) ||
        (biz.category && biz.category.toLowerCase().includes(queryLower));
      const matchLoc = !locationLower || (biz.address && biz.address.toLowerCase().includes(locationLower));
      const matchCat = !categoryLower || (biz.category && biz.category.toLowerCase().includes(categoryLower));
      return matchQuery && matchLoc && matchCat;
    });

    if (filtered.length === 0 && (queryLower || locationLower)) {
      // Dynamic fallback for user custom queries so search returns realistic entries
      filtered = [
        {
          providerId: `biz_dyn_${Date.now()}_1`,
          name: `${params.query || 'Global Enterprise'} Group`,
          category: params.category || 'B2B Commercial Services',
          phone: '+1 (555) 789-0123',
          address: `100 Commercial Plaza, ${params.location || 'Metropolis'}`,
          website: `https://${(params.query || 'enterprise').replace(/[^a-z0-9]/gi, '').toLowerCase()}.example.com`,
          rating: 4.5,
          reviewCount: 15,
          providerUrl: 'https://maps.example.com/place/custom1',
        },
        {
          providerId: `biz_dyn_${Date.now()}_2`,
          name: `${params.location || 'Metropolitan'} ${params.query || 'Industrial'} Partners`,
          category: params.category || 'Professional Services',
          phone: '+1 (555) 890-1234',
          address: `450 Corporate Blvd, ${params.location || 'Metropolis'}`,
          website: `https://${(params.location || 'metro').replace(/[^a-z0-9]/gi, '').toLowerCase()}partners.example.com`,
          rating: 4.7,
          reviewCount: 22,
          providerUrl: 'https://maps.example.com/place/custom2',
        },
      ];
    }

    const limit = params.limit || 10;
    return {
      businesses: filtered.slice(0, limit),
      totalResults: filtered.length,
      providerName: 'Business Directory API Provider',
    };
  }

  async getBusinessDetails(providerId: string): Promise<BusinessItem | null> {
    const item = this.sampleDatabase.find((b) => b.providerId === providerId);
    return item || null;
  }
}

// Singleton Business Finder Provider Resolver
export function getBusinessSearchProvider(): BusinessSearchProvider {
  // Can expand to evaluate process.env.BUSINESS_FINDER_PROVIDER === 'google_places'
  return new MockBusinessSearchProvider();
}
