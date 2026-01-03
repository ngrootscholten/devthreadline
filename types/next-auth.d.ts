import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Extend the built-in session types to include custom fields
   */
  interface Session {
    user: {
      id: string
      emailVerified: Date | null
      company?: string | null
      accountId?: string | null
    } & DefaultSession["user"]
  }

  /**
   * Extend the built-in user types to include custom fields
   */
  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    emailVerified: Date | null
    company?: string | null
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT token to include custom fields
   */
  interface JWT {
    id: string
    email: string
    name?: string | null
    company?: string | null
    emailVerified: Date | null
    accountId?: string | null
  }
}

