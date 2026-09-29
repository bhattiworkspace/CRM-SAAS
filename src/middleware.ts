import { withAuth } from 'next-auth/middleware';

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || 'crm-saas-production-secret-key-123456',
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/contacts/:path*',
    '/companies/:path*',
    '/deals/:path*',
    '/activities/:path*',
    '/tasks/:path*',
    '/communications/:path*',
    '/sequences/:path*',
    '/workflows/:path*',
    '/ai/:path*',
    '/business-finder/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/audit-logs/:path*',
  ],
};
