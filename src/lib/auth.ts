import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { DEFAULT_ROLE_PERMISSIONS, PermissionCode } from './permissions';

export interface TenantSessionContext {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    roleId: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
  };
  permissions: PermissionCode[];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      if (trigger === 'update' && session?.activeOrganizationId) {
        token.activeOrganizationId = session.activeOrganizationId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id: string }).id = token.id as string;
        (session as unknown as { activeOrganizationId?: string }).activeOrganizationId =
          token.activeOrganizationId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'crm-saas-production-secret-key-123456',
};

export async function getTenantSession(requestedOrgId?: string): Promise<TenantSessionContext | null> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !(session.user as { id?: string }).id) {
    return null;
  }

  const userId = (session.user as { id: string }).id;

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      organization: true,
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!memberships || memberships.length === 0) {
    return null;
  }

  let targetMembership = memberships[0];

  if (requestedOrgId) {
    const found = memberships.find((m) => m.organizationId === requestedOrgId);
    if (found) {
      targetMembership = found;
    }
  }

  const roleName = targetMembership.role.name;
  
  let permissionCodes: PermissionCode[] = targetMembership.role.rolePermissions.map(
    (rp) => rp.permission.code as PermissionCode
  );

  if (permissionCodes.length === 0 && DEFAULT_ROLE_PERMISSIONS[roleName]) {
    permissionCodes = DEFAULT_ROLE_PERMISSIONS[roleName];
  }

  return {
    user: {
      id: userId,
      name: session.user.name || '',
      email: session.user.email || '',
      image: session.user.image || null,
    },
    organization: {
      id: targetMembership.organization.id,
      name: targetMembership.organization.name,
      slug: targetMembership.organization.slug,
    },
    membership: {
      id: targetMembership.id,
      roleId: targetMembership.roleId,
      status: targetMembership.status,
    },
    role: {
      id: targetMembership.role.id,
      name: targetMembership.role.name,
    },
    permissions: permissionCodes,
  };
}

export async function requireTenantPermission(
  requiredPermission: PermissionCode,
  requestedOrgId?: string
): Promise<TenantSessionContext> {
  const context = await getTenantSession(requestedOrgId);

  if (!context) {
    throw new Error('UNAUTHORIZED: Authentication and active organization membership required.');
  }

  if (!context.permissions.includes(requiredPermission)) {
    throw new Error(`FORBIDDEN: Missing required permission '${requiredPermission}'.`);
  }

  return context;
}
