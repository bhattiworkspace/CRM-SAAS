import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'crm-saas-production-secret-key-v2-987654';
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
