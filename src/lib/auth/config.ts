import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "@auth/core/adapters"
import bcrypt from "bcryptjs"
import prisma from "../prisma"
import { buildPermissionsMap, type Permissions } from "./permissions"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        merchantCode: { label: "Merchant Code", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.merchantCode || !credentials?.email || !credentials?.password) {
          return null
        }

        const merchantCode = credentials.merchantCode as string
        const email = credentials.email as string
        const password = credentials.password as string

        // Find merchant by code first
        const merchant = await prisma.merchant.findUnique({
          where: { code: merchantCode },
        })

        if (!merchant || !merchant.isActive) {
          throw new Error("Invalid merchant code")
        }

        // Find user by email within this merchant, include role for permissions
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            merchant: true,
            branch: true,
            roleObj: {
              include: { permissions: true },
            },
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        // Verify user belongs to this merchant
        if (user.merchantId !== merchant.id) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) return null

        // Build permissions map from the user's role
        const permissions = user.roleObj?.permissions
          ? buildPermissionsMap(user.roleObj.permissions)
          : null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleId: user.roleId,
          merchantId: user.merchantId,
          branchId: user.branchId,
          image: user.avatar,
          permissions,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // User type is augmented via next-auth module declaration
        token.role = user.role as string | undefined
        token.roleId = user.roleId as string | null | undefined
        token.merchantId = user.merchantId as string | null | undefined
        token.branchId = user.branchId as string | null | undefined
        token.permissions = user.permissions as Permissions | null | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.roleId = token.roleId as string | null | undefined
        session.user.merchantId = token.merchantId as string | null | undefined
        session.user.branchId = token.branchId as string | null | undefined
        session.user.permissions = token.permissions as Permissions | null
      }
      return session
    },
  },
})
