import NextAuth, { type NextAuthConfig } from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import Email from "next-auth/providers/email"
import { getPool } from "../../../lib/db"
import { ServerClient } from "postmark"
import type { User } from "next-auth"

// Lazy Postmark client creation - only creates when sending email
function getPostmarkClient() {
  if (!process.env.POSTMARK_API_TOKEN) {
    throw new Error('POSTMARK_API_TOKEN environment variable is not set')
  }
  return new ServerClient(process.env.POSTMARK_API_TOKEN)
}

// Lazy NextAuth initialization - only creates adapter when actually needed
// This prevents database connection during build time
function getNextAuthConfig(): NextAuthConfig {
  // Only create adapter if DATABASE_URL is available (runtime, not build time)
  const adapter = process.env.DATABASE_URL 
    ? PostgresAdapter(getPool())
    : undefined
  
  return {
    adapter,
    providers: [
    Email({
      from: process.env.POSTMARK_FROM_EMAIL,
      // Provide minimal server config to satisfy NextAuth (we override sendVerificationRequest)
      server: {
        host: "smtp.postmarkapp.com",
        port: 587,
        auth: {
          user: "not-used",
          pass: "not-used",
        },
      },
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // Customize email sending to use Postmark
        // Transform NextAuth's callback URL to our confirmation page
        // This prevents spam bots from auto-clicking and consuming the token
        const urlObj = new URL(url)
        const token = urlObj.searchParams.get('token')
        const email = urlObj.searchParams.get('email')
        
        if (!token || !email) {
          throw new Error('Missing token or email in callback URL')
        }
        
        // Route to confirmation page instead of direct callback
        // Token won't be consumed until user clicks button
        const confirmationUrl = `${process.env.NEXTAUTH_URL}/auth/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        
        try {
          const postmarkClient = getPostmarkClient()
          await postmarkClient.sendEmail({
            From: process.env.POSTMARK_FROM_EMAIL!,
            To: identifier,
            Subject: "Sign in to Threadline",
            HtmlBody: `
              <h2>Sign in to Threadline</h2>
              <p>Click the button below to sign in to your Threadline account:</p>
              <p><a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign in to Threadline</a></p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${confirmationUrl}</p>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">This link will expire in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
            `,
            TextBody: `Sign in to Threadline\n\nClick this link to sign in:\n${confirmationUrl}\n\nThis link will expire in 24 hours.`,
            MessageStream: "outbound",
          })
        } catch (error) {
          console.error('Failed to send email via Postmark:', error)
          throw new Error('Failed to send verification email')
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-email",
  },
  callbacks: {
    async signIn({ user }: { user: User }) {
      // Only allow sign in if email is verified
      if (user.emailVerified) {
        return true
      }
      return false
    },
    async jwt({ token, user }: { token: any; user?: User }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.company = user.company
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      // Fetch fresh user data from database to ensure we have latest name/company/account_id
      // If database query fails, let error propagate - NextAuth will handle it appropriately
      if (token.id) {
        const pool = getPool()
        const userResult = await pool.query(
          `SELECT id, email, name, company, "emailVerified", account_id FROM users WHERE id = $1`,
          [token.id]
        )
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0]
          if (session.user) {
            session.user.id = user.id
            session.user.email = user.email
            session.user.name = user.name
            ;(session.user as any).company = user.company
            session.user.emailVerified = user.emailVerified
            ;(session.user as any).accountId = user.account_id || null
          }
        }
      }
      return session
    },
  },
  }
}

// Initialize NextAuth lazily - config is only created when this module is actually used
// During build, if DATABASE_URL is missing, adapter will be undefined
// NextAuth will handle this gracefully (it may use a fallback or fail at runtime)
const nextAuthConfig = getNextAuthConfig()
export const { handlers, signIn, signOut, auth } = NextAuth(nextAuthConfig)

export const { GET, POST } = handlers

