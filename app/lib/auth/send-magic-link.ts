import { getPool } from "../db"
import { ServerClient } from "postmark"
import { randomBytes, createHash } from "crypto"
import { getAdapter } from "./adapter"

/**
 * Send a magic link email to a user
 * Creates a verification token using NextAuth adapter and sends it via Postmark
 */
export async function sendMagicLink(email: string, accountId: string): Promise<void> {
  if (!process.env.POSTMARK_API_TOKEN) {
    throw new Error("POSTMARK_API_TOKEN environment variable is not set")
  }

  if (!process.env.NEXTAUTH_URL) {
    throw new Error("NEXTAUTH_URL environment variable is not set")
  }

  if (!process.env.POSTMARK_FROM_EMAIL) {
    throw new Error("POSTMARK_FROM_EMAIL environment variable is not set")
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set")
  }

  const pool = getPool()

  // Check if user exists and belongs to the account
  const userResult = await pool.query(
    `SELECT id, email, account_id FROM users WHERE email = $1 AND account_id = $2`,
    [email, accountId]
  )

  if (userResult.rows.length === 0) {
    throw new Error("User not found or does not belong to this account")
  }

  // Generate random token (32 bytes = 64 hex characters)
  const tokenString = randomBytes(32).toString("hex")

  // Hash token with NEXTAUTH_SECRET (same method NextAuth uses internally)
  const hashedToken = createHash("sha256")
    .update(`${tokenString}${process.env.NEXTAUTH_SECRET}`)
    .digest("hex")

  // Calculate expiry (48 hours)
  const maxAge = 48 * 60 * 60 // seconds
  const expires = new Date(Date.now() + maxAge * 1000)

  // Get adapter and store hashed token
  const adapter = getAdapter()
  if (!adapter.createVerificationToken) {
    throw new Error("Adapter does not support createVerificationToken")
  }

  // Delete any existing tokens for this email first
  await pool.query(
    `DELETE FROM verification_token WHERE identifier = $1`,
    [email]
  )

  // Store hashed token using adapter
  await adapter.createVerificationToken({
    identifier: email,
    expires,
    token: hashedToken, // Store the HASHED version
  })

  // Generate magic link URL (using unified confirmation page)
  // Use UNHASHED token in URL - NextAuth's callback will hash it for validation
  const confirmationUrl = `${process.env.NEXTAUTH_URL}/auth/confirm?token=${encodeURIComponent(tokenString)}&email=${encodeURIComponent(email)}`

  // Send email via Postmark
  const postmarkClient = new ServerClient(process.env.POSTMARK_API_TOKEN)
  await postmarkClient.sendEmail({
    From: process.env.POSTMARK_FROM_EMAIL,
    To: email,
    Subject: "Sign in to Threadline",
    HtmlBody: `
      <h2>Sign in to Threadline</h2>
      <p>Click the button below to sign in to your Threadline account:</p>
      <p><a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign in to Threadline</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 14px;">${confirmationUrl}</p>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">This link will expire in 48 hours.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
    `,
    TextBody: `Sign in to Threadline\n\nClick this link to sign in:\n${confirmationUrl}\n\nThis link will expire in 48 hours.`,
    MessageStream: "outbound",
  })
}

