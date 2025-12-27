import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import Email from "next-auth/providers/email"
import { getPool } from "../../../lib/db"
import { ServerClient } from "postmark"

const pool = getPool()
const postmarkClient = new ServerClient(process.env.POSTMARK_API_TOKEN!)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool),
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
    async signIn({ user, email }) {
      // Only allow sign in if email is verified
      if (user.emailVerified) {
        return true
      }
      return false
    },
    async jwt({ token, user }) {
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
      // Fetch fresh user data from database to ensure we have latest name/company
      if (token.id) {
        try {
          const userResult = await pool.query(
            `SELECT id, email, name, company, "emailVerified" FROM users WHERE id = $1`,
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
            }
          }
        } catch (error) {
          console.error('Error fetching user in session callback:', error)
          // Fallback to token values if DB query fails
          if (session.user) {
            session.user.id = token.id as string
            session.user.email = token.email as string
            session.user.name = token.name as string | null | undefined
            ;(session.user as any).company = token.company as string | null | undefined
            session.user.emailVerified = token.emailVerified as Date | null
          }
        }
      }
      return session
    },
  },
})

export const { GET, POST } = handlers

