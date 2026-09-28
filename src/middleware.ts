export { default } from 'next-auth/middleware';

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
