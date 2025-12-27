# Authentication & Database Infrastructure Implementation Plan

## Overview

This plan covers the foundational infrastructure needed for user authentication and database setup. This is Phase 1 of a larger user management and auditability system.

## Goals

1. Set up PostgreSQL database (Supabase with native connection string)
2. Configure NextAuth.js with Postgres adapter for user authentication
3. Implement basic sign-up and sign-in flows
4. Create database schema for NextAuth tables
5. Set up environment variable configuration

## Scope (What's Included)

- ✅ PostgreSQL database setup via Supabase
- ✅ NextAuth.js configuration with Postgres adapter
- ✅ Magic link authentication (email-based, passwordless)
- ✅ Email verification via Postmark
- ✅ User sign-up and sign-in pages
- ✅ Email confirmation page (handles enterprise spam filters)
- ✅ Protected route middleware
- ✅ Database schema for NextAuth (users, sessions, accounts, verification tokens)
- ✅ User profile fields: email, name, company
- ✅ JWT-based sessions
- ✅ Environment variable setup and documentation

## Out of Scope (Future Phases)

- ❌ User profile management UI
- ❌ API key management
- ❌ Threadline check logging/audit tables
- ❌ GitHub/GitLab PAT integration
- ❌ OAuth providers (GitHub, Google, etc.)
- ❌ Password-based authentication

---

## Architecture

### Database: Supabase PostgreSQL

**Why Supabase:**
- Managed PostgreSQL with native connection string support
- Free tier suitable for development
- Easy to migrate to self-hosted Postgres later if needed
- Built-in connection pooling

**Connection:**
- Use native PostgreSQL connection string (not Supabase SDK)
- Format: `postgresql://user:password@host:port/database`
- Connection string from Supabase dashboard → Settings → Database → Connection string

### Authentication: NextAuth.js v5 (Auth.js)

**Why NextAuth v5:**
- Latest version with improved TypeScript support
- Built-in Postgres adapter
- Session management
- Extensible for future OAuth providers

**Adapter:**
- `@auth/pg-adapter` for PostgreSQL
- Stores users, sessions, accounts, verification tokens

---

## Implementation Steps

### Phase 1: Database Setup

#### 1.1 Create Supabase Project
- [ ] Sign up/login to Supabase
- [ ] Create new project
- [ ] Note project credentials (host, database, user, password)
- [ ] Get connection string from Settings → Database

#### 1.2 Configure Environment Variables
- [ ] Add `DATABASE_URL` to `.env.local`:
  ```
  DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  ```
- [ ] Add to `.env.example` (without actual credentials)
- [ ] Document in README or config docs

#### 1.3 Test Database Connection
- [ ] Create simple test script to verify connection
- [ ] Or use Supabase dashboard SQL editor to verify

---

### Phase 2: NextAuth Setup

#### 2.1 Install Dependencies
```bash
npm install next-auth@beta @auth/pg-adapter pg postmark
npm install --save-dev @types/pg
```

**Dependencies:**
- `next-auth@beta` - NextAuth v5 (Auth.js)
- `@auth/pg-adapter` - PostgreSQL adapter for NextAuth
- `pg` - PostgreSQL client for Node.js
- `postmark` - Postmark API client for sending emails
- `@types/pg` - TypeScript types

#### 2.2 Install Postmark SDK
```bash
npm install postmark
```

#### 2.3 Configure NextAuth with Postmark

**File: `app/api/auth/[...nextauth]/route.ts`**
```typescript
import NextAuth from "next-auth"
import { PostgresAdapter } from "@auth/pg-adapter"
import Email from "next-auth/providers/email"
import { Pool } from "pg"
import { ServerClient } from "postmark"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const postmarkClient = new ServerClient(process.env.POSTMARK_API_TOKEN!)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Email({
      from: process.env.POSTMARK_FROM_EMAIL,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // Use Postmark API instead of SMTP for better reliability
        const magicLink = `${process.env.NEXTAUTH_URL}/auth/confirm?token=${url.split('token=')[1]}`
        
        await postmarkClient.sendEmail({
          From: process.env.POSTMARK_FROM_EMAIL!,
          To: identifier,
          Subject: "Sign in to Threadline",
          HtmlBody: `
            <h2>Sign in to Threadline</h2>
            <p>Click the link below to sign in:</p>
            <p><a href="${magicLink}">${magicLink}</a></p>
            <p>If the link doesn't work, copy and paste it into your browser.</p>
            <p>This link will expire in 24 hours.</p>
          `,
          TextBody: `Sign in to Threadline: ${magicLink}`,
          MessageStream: "outbound",
        })
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
        token.company = (user as any).company
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // User created - company field should already be saved via adapter
      // If we need custom logic, add it here
    },
  },
})

// Custom sign-in handler to collect name/company
// File: app/api/auth/signin/route.ts (if needed)
// Or handle in the sign-in page form submission
```

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here # Generate with PowerShell: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Postmark
POSTMARK_API_TOKEN=your-postmark-api-token
POSTMARK_FROM_EMAIL=noreply@yourdomain.com
```

#### 2.3 Create Database Schema

NextAuth requires these tables:
- `users` - User accounts
- `accounts` - OAuth accounts (for future use)
- `sessions` - Active sessions (if using database sessions)
- `verification_tokens` - Email verification tokens

**Option A: Use NextAuth migration script**
- NextAuth provides SQL migration scripts
- Run via Supabase SQL editor or migration tool

**Option B: Manual schema creation**
- Create tables based on NextAuth adapter requirements
- Document schema in migration file

**Recommended:** Use NextAuth's official schema migration

---

### Phase 3: Authentication Pages

#### 3.1 Sign In/Sign Up Page (Unified)
**File: `app/auth/signin/page.tsx`**
- Single page for both sign in and sign up
- Email input only (no password)
- Optional: Name and Company fields (for new users)
- Submit button ("Sign in with email" or "Continue with email")
- Message: "We'll send you a magic link to sign in"
- Error handling
- Auto-detects if user exists (sign in) or is new (sign up)
- For new users: Collect name and company before sending email
- For existing users: Just email, skip profile fields

#### 3.2 Email Verification Page
**File: `app/auth/verify-email/page.tsx`**
- Shown after user submits email
- Message: "Check your email for a magic link"
- Email address displayed (for confirmation)
- Resend link button
- Instructions for enterprise email filters

#### 3.3 Email Confirmation Page
**File: `app/auth/confirm/page.tsx`**
- Shown when user clicks magic link from email
- Handles enterprise spam filter redirects (common pattern: spam filter adds redirect parameter)
- "Confirming your email..." loading state
- Validates token from URL query parameter
- Calls NextAuth verification endpoint
- Success: Redirect to dashboard/home
- Error: Show error message, option to resend
- Handles expired/invalid tokens gracefully

#### 3.4 Auth Layout
**File: `app/auth/layout.tsx`**
- Shared layout for auth pages
- Consistent styling with main site
- Minimal navigation (back to home)

---

### Phase 4: Protected Routes & Middleware

#### 4.1 Middleware
**File: `middleware.ts`**
```typescript
import { auth } from "@/app/api/auth/[...nextauth]/route"

export default auth((req) => {
  // Protect routes that require authentication
  // Redirect to sign-in if not authenticated
})
```

#### 4.2 Protected Route Example
- Create example protected page (e.g., `/dashboard`)
- Show user info when authenticated
- Redirect to sign-in if not authenticated

---

### Phase 5: User Profile Collection

#### 5.1 Challenge: NextAuth Email Provider Limitation
NextAuth's Email provider only collects email by default. To collect name and company, we have two options:

**Option A: Custom Sign-Up Flow (Recommended)**
1. Create custom API route: `app/api/auth/signup/route.ts`
2. Collect email, name, company in form
3. Check if user exists (query database)
4. If new user: Create user record with all fields, then send magic link
5. If existing user: Just send magic link (skip profile fields)
6. Use NextAuth's `signIn` function with email provider

**Option B: Collect After Verification**
1. User signs in with email only
2. After email verification, show profile completion page
3. Update user record with name/company
4. Simpler but adds extra step

**Recommendation:** Option A - better UX, collects info upfront

#### 5.2 Implementation: Custom Sign-Up API Route
**File: `app/api/auth/signup/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/app/api/auth/[...nextauth]/route'
import { pool } from '@/lib/db' // Database connection

export async function POST(req: NextRequest) {
  const { email, name, company } = await req.json()
  
  // Check if user exists
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  
  if (result.rows.length === 0) {
    // New user - create with name/company
    // NextAuth will create user when magic link is clicked
    // We'll need to update user record after creation
    // Or use custom user creation logic
  }
  
  // Send magic link via NextAuth
  await signIn('email', { email, redirect: false })
  
  return NextResponse.json({ success: true })
}
```

**Alternative:** Use NextAuth's database adapter directly to create user with all fields before sending email.

---

### Phase 6: UI Integration

#### 6.1 Update Navigation
- Add "Sign In" link when not authenticated
- Add user menu (dropdown) when authenticated
- Show user email/name/company

#### 6.2 User Menu Component
- Sign out button
- Profile link (future - for editing name/company)
- Settings link (future)

---

## Database Schema (NextAuth)

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  email_verified TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** NextAuth adapter will create this table automatically. We'll need to add `company` field via migration.

### Accounts Table (for OAuth - future)
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);
```

### Sessions Table (if using database sessions)
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);
```

### Verification Tokens Table
```sql
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

**Note:** NextAuth adapter will create these tables automatically if using their migration script.

---

## Environment Variables

### Required
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth
NEXTAUTH_URL=http://localhost:3000  # or https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here
```

### Required for Email (Postmark)
```bash
# Postmark
POSTMARK_API_TOKEN=your-postmark-api-token
POSTMARK_FROM_EMAIL=noreply@yourdomain.com
POSTMARK_SMTP_HOST=smtp.postmarkapp.com
POSTMARK_SMTP_PORT=587
```

### Optional (for future)
```bash
# OAuth (future)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Decisions Made

### 1. Authentication Method
**Decision:** Email-based magic links (passwordless authentication)
- No passwords required
- User enters email, receives magic link
- Click link to sign in/sign up
- More secure and user-friendly

### 2. Session Strategy
**Decision:** JWT-based sessions (stateless)
- Simpler implementation
- No session table needed
- Stateless authentication

### 3. Email Verification
**Decision:** Required email verification
- Users must verify email before accessing protected features
- Uses Postmark for email delivery
- Confirmation page after clicking email link (handles enterprise spam filters)

### 4. User Profile Fields
**Decision:** email, name, company
- Email (required, unique)
- Name (optional)
- Company (optional)

### 5. Email Provider
**Decision:** Postmark
- Paid account available
- Reliable delivery
- Good for transactional emails

---

## Testing Strategy

### Manual Testing
- [ ] Sign up with new email
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials (error handling)
- [ ] Sign out
- [ ] Access protected route when not authenticated (redirect)
- [ ] Access protected route when authenticated (success)

### Database Testing
- [ ] Verify user created in database
- [ ] Verify session created (if using DB sessions)
- [ ] Verify password is hashed (not plain text)

---

## Security Considerations

1. **Password Hashing**
   - NextAuth uses bcrypt by default ✅
   - Never store plain text passwords

2. **Session Security**
   - Use HTTPS in production
   - Secure cookie settings
   - CSRF protection (NextAuth handles this)

3. **Database Security**
   - Use connection pooling
   - Never expose DATABASE_URL in client code
   - Use environment variables only

4. **SQL Injection**
   - NextAuth adapter handles parameterized queries ✅
   - Never write raw SQL with user input

---

## Migration Path

### From Current State
1. Current: No authentication, API key-based auth for CLI
2. Phase 1: Add user auth, keep API key system separate
3. Future: Link API keys to user accounts

### Future Enhancements
- Email verification
- Password reset flow
- OAuth providers (GitHub, Google)
- Two-factor authentication
- User profile management
- API key management UI

---

## Timeline Estimate

- **Database Setup:** 1-2 hours
- **NextAuth Configuration:** 3-4 hours (includes Postmark integration)
- **Auth Pages (Sign In, Verify, Confirm):** 4-5 hours
- **Postmark Email Integration:** 2-3 hours
- **Protected Routes & Middleware:** 2-3 hours
- **UI Integration:** 2-3 hours
- **Testing & Polish:** 3-4 hours

**Total:** ~17-24 hours

---

## References

- [NextAuth.js v5 Docs](https://authjs.dev/)
- [NextAuth Postgres Adapter](https://authjs.dev/reference/adapter/pg)
- [Supabase PostgreSQL Docs](https://supabase.com/docs/guides/database)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## Postmark Integration Details

### Why Postmark API vs SMTP
- **Better deliverability:** Postmark API has better reputation than SMTP
- **More reliable:** Built for transactional emails
- **Better tracking:** Can track email opens, clicks (if needed)
- **Template support:** Can use Postmark templates later

### Email Template
- Simple HTML email with magic link
- Clear call-to-action button
- Fallback text version
- Instructions for enterprise email filters

### Magic Link Format
- Link points to: `/auth/confirm?token=...`
- Token is validated server-side
- Expires after 24 hours (configurable)
- Single-use token (invalidated after use)

### Enterprise Spam Filter Handling
Many enterprise email filters (like Proofpoint, Mimecast) add redirect parameters:
- Original: `https://threadline.com/auth/confirm?token=abc123`
- After filter: `https://threadline.com/auth/confirm?token=abc123&redirect=...`

The confirmation page should:
1. Extract token from URL (handle redirect parameters)
2. Validate token
3. Complete authentication
4. Redirect to intended destination

## Database Migration for Company Field

After NextAuth creates the base schema, add company field:

```sql
ALTER TABLE users ADD COLUMN company TEXT;
```

Or create migration file:
**File: `migrations/001_add_company_to_users.sql`**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
```

## Testing Checklist

### Email Flow Testing
- [ ] Sign in with new email (creates account)
- [ ] Sign in with existing email (signs in)
- [ ] Email received with magic link
- [ ] Click magic link → redirects to confirmation page
- [ ] Confirmation page validates token
- [ ] Success → redirects to dashboard
- [ ] Expired token → shows error, option to resend
- [ ] Invalid token → shows error
- [ ] Enterprise spam filter redirect → still works

### User Profile Testing
- [ ] User created with email
- [ ] Name field saved (if provided)
- [ ] Company field saved (if provided)
- [ ] Email verification timestamp set
- [ ] JWT session created with user data

