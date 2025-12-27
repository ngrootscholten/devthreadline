-- Threadline Database Schema
-- Master source of truth - can create database from scratch
-- Run this on a fresh database to set up all tables

-- ============================================================================
-- IMPORTANT: NextAuth Adapter Column Naming Convention
-- ============================================================================
-- The NextAuth Postgres adapter REQUIRES camelCase column names for its fields.
-- This is hardcoded in the adapter and cannot be changed.
-- 
-- For our own custom fields (like 'company'), we use snake_case to follow
-- PostgreSQL conventions.
--
-- This means some tables will have MIXED naming:
--   - NextAuth fields: camelCase (emailVerified, sessionToken, etc.)
--   - Our fields: snake_case (company, created_at, updated_at)
--
-- Each camelCase field below is documented as "NextAuth required"
-- ============================================================================

-- ============================================================================
-- NextAuth Required Tables
-- ============================================================================
-- These tables are REQUIRED by the NextAuth Postgres adapter.
-- Do not rename columns marked as "NextAuth required" - the adapter expects
-- these exact names in camelCase.

-- Users table
-- NextAuth required table - stores user accounts
CREATE TABLE IF NOT EXISTS users (
  -- NextAuth required fields (camelCase - MUST be quoted to preserve case):
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT, -- NextAuth required
  email TEXT UNIQUE NOT NULL, -- NextAuth required
  "emailVerified" TIMESTAMP, -- NextAuth required (camelCase - quoted to preserve case)
  image TEXT, -- NextAuth required
  
      -- Our custom fields (snake_case):
      company TEXT, -- Custom field for user's company
      api_key_hash TEXT, -- Hashed API key for CLI authentication (SHA256 hash)
      api_key_created_at TIMESTAMP, -- When the API key was generated
      
      -- Timestamps (snake_case - our convention):
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

-- Accounts table
-- NextAuth required table - stores OAuth account connections (for future OAuth providers)
-- Currently not used (we only use email auth), but required by adapter
CREATE TABLE IF NOT EXISTS accounts (
  -- NextAuth required fields (camelCase fields MUST be quoted to preserve case):
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- NextAuth required (camelCase - quoted)
  type TEXT NOT NULL, -- NextAuth required
  provider TEXT NOT NULL, -- NextAuth required
  "providerAccountId" TEXT NOT NULL, -- NextAuth required (camelCase - quoted)
  refresh_token TEXT, -- NextAuth required (snake_case - exception in adapter)
  access_token TEXT, -- NextAuth required (snake_case - exception in adapter)
  expires_at INTEGER, -- NextAuth required (snake_case - exception in adapter)
  token_type TEXT, -- NextAuth required (snake_case - exception in adapter)
  scope TEXT, -- NextAuth required
  id_token TEXT, -- NextAuth required (snake_case - exception in adapter)
  "session_state" TEXT, -- NextAuth required (camelCase - quoted, though adapter may use snake_case)
  UNIQUE(provider, "providerAccountId")
);

-- Sessions table
-- NextAuth required table - stores database sessions (not used with JWT strategy, but adapter may create it)
CREATE TABLE IF NOT EXISTS sessions (
  -- NextAuth required fields (camelCase fields MUST be quoted to preserve case):
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT UNIQUE NOT NULL, -- NextAuth required (camelCase - quoted)
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- NextAuth required (camelCase - quoted)
  expires TIMESTAMP NOT NULL -- NextAuth required
);

-- Verification tokens table
-- NextAuth required table - stores email verification tokens for magic links
-- NOTE: NextAuth adapter expects table name to be "verification_token" (singular)
CREATE TABLE IF NOT EXISTS verification_token (
  -- NextAuth required fields:
  identifier TEXT NOT NULL, -- NextAuth required
  token TEXT NOT NULL, -- NextAuth required
  expires TIMESTAMP NOT NULL, -- NextAuth required
  PRIMARY KEY (identifier, token)
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- RLS is enabled on ALL tables with NO exception policies.
-- This ensures that Supabase's public API key CANNOT access any data,
-- even if accidentally used in client-side code.
--
-- Why this matters:
-- 1. Defense in depth: Blocks all access via Supabase REST/GraphQL APIs
-- 2. Explicit access control: All database access must go through server-side
--    code using the direct PostgreSQL connection string
-- 3. Zero-trust: No default access - prevents accidental data exposure
-- 4. Future-proofing: If Supabase client-side features are added later,
--    explicit policies must be created (preventing accidental exposure)
--
-- All database access should use the DATABASE_URL connection string in
-- server-side code (Next.js API routes, server components, etc.)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_token ENABLE ROW LEVEL SECURITY;

-- No policies created = all access via Supabase public API is blocked
-- Server-side access via direct PostgreSQL connection (DATABASE_URL) is unaffected

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId"); -- Note: camelCase column name
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId"); -- Note: camelCase column name
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions("sessionToken"); -- Note: camelCase column name
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

