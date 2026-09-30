import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// The secret is already handled in authOptions via src/lib/auth.ts

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
