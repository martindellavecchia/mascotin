import { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { rateLimit, RATE_LIMITS } from './rate-limit';
import { loginSchema } from './schemas';
import { getSessionTokenCookie, shouldUseSecureCookies } from './auth-cookies';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  useSecureCookies: shouldUseSecureCookies(),
  cookies: {
    sessionToken: getSessionTokenCookie(),
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
          });

          if (!parsed.success) {
            return null;
          }

          const email = parsed.data.email.toLowerCase();
          const { password } = parsed.data;

          const limit = await rateLimit(`auth:${email}`, RATE_LIMITS.auth);
          if (!limit.allowed) {
            return null;
          }

          const user = await db.user.findFirst({
            where: {
              email: {
                equals: email,
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
              isBlocked: true,
              emailVerified: true,
              role: true,
              owner: {
                select: {
                  image: true,
                },
              },
              stores: {
                where: { isActive: true },
                select: { id: true },
                take: 1,
              },
            },
          });

          if (!user || !user.password) {
            return null;
          }

          if (user.isBlocked) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            return null;
          }

          let role = user.role;

          if (ADMIN_EMAILS.includes(email)) {
            if (role !== 'ADMIN') {
              await db.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' },
              });
              role = 'ADMIN';
              console.warn(`[SECURITY] Auto-promoted ${email} to ADMIN role`);
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role,
            headerImage: user.owner?.image ?? null,
            isBusinessOwner: user.stores.length > 0,
          };
        } catch (error) {
          console.error('[auth] authorize failed:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.headerImage = user.headerImage ?? null;
        token.isBusinessOwner = user.isBusinessOwner ?? false;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      if (token.id && (trigger === 'update' || typeof token.isBusinessOwner !== 'boolean')) {
        const store = await db.store.findFirst({
          where: { providerId: token.id, isActive: true },
          select: { id: true },
        });
        token.isBusinessOwner = Boolean(store);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || token.sub || '';
        session.user.role = token.role as string;
        session.user.headerImage = (token.headerImage as string | null) ?? null;
        session.user.isBusinessOwner = Boolean(token.isBusinessOwner);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
