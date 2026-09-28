export interface AppConfig {
  appName: string;
  appDescription: string;
  companyName: string;
  logo: {
    text: string;
    icon: string;
  };
  primaryColor: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultCurrency: string;
}

export const appConfig: AppConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'CRM',
  appDescription: 'Modern B2B Multi-Tenant CRM SaaS Application',
  companyName: 'CRM Inc.',
  logo: {
    text: 'CRM',
    icon: 'Building2',
  },
  primaryColor: '#0c8de4',
  supportEmail: 'support@example.com',
  defaultTimezone: 'UTC',
  defaultCurrency: 'USD',
};
