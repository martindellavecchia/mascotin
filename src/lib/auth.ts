import { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { Adapter } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { rateLimit, RATE_LIMITS } from './rate-limit';

// Emails that are always promoted to ADMIN on login
const ADMIN_EMAILS = ['dellavec@gmail.com'];

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: 'jwt',
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
          const { email, password } = loginSchema.parse(credentials);

          const limit = await rateLimit(`auth:${email}`, RATE_LIMITS.auth);
          if (!limit.allowed) {
            throw new Error('RATE_LIMITED');
          }

          const user = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
              isBlocked: true,
              emailVerified: true,
            },
          });

          if (!user || !user.password) {
            throw new Error('INVALID_CREDENTIALS');
          }

          if (user.isBlocked) {
            throw new Error('ACCOUNT_BLOCKED');
          }

          // TODO: Re-enable when SMTP is configured
          // if (!user.emailVerified) {
          //   throw new Error('EMAIL_NOT_VERIFIED');
          // }

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            throw new Error('INVALID_CREDENTIALS');
          }

          // Auto-promote configured admin emails
          if (ADMIN_EMAILS.includes(email)) {
            await db.user.update({
              where: { id: user.id },
              data: { role: 'ADMIN' },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          if (error instanceof Error && [
            'RATE_LIMITED',
            'INVALID_CREDENTIALS',
            'ACCOUNT_BLOCKED',
            'EMAIL_NOT_VERIFIED',
          ].includes(error.message)) {
            throw error;
          }
          throw new Error('INVALID_CREDENTIALS');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Refresh role from DB on each token refresh
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const auth = NextAuth(authOptions);
