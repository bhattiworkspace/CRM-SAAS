import React from 'react';
import type { Metadata } from 'next';
import { appConfig } from '@/config/app.config';
import { SessionProvider } from '@/components/providers/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: `${appConfig.appName} - Modern B2B Multi-Tenant CRM`,
  description: appConfig.appDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
