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
  "emailVerified" TIMESTAMPTZ, -- NextAuth required (camelCase - quoted to preserve case)
  image TEXT, -- NextAuth required
  
      -- Our custom fields (snake_case):
      company TEXT, -- Custom field for user's company
      api_key_hash TEXT, -- Hashed API key for CLI authentication (SHA256 hash)
      api_key_created_at TIMESTAMPTZ, -- When the API key was generated
      
      -- Timestamps (snake_case - our convention):
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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
  expires TIMESTAMPTZ NOT NULL -- NextAuth required
);

-- Verification tokens table
-- NextAuth required table - stores email verification tokens for magic links
-- NOTE: NextAuth adapter expects table name to be "verification_token" (singular)
CREATE TABLE IF NOT EXISTS verification_token (
  -- NextAuth required fields:
  identifier TEXT NOT NULL, -- NextAuth required
  token TEXT NOT NULL, -- NextAuth required
  expires TIMESTAMPTZ NOT NULL, -- NextAuth required
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

-- ============================================================================
-- Audit and Analysis Tables for Threadline Checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  account TEXT NOT NULL,
  repo_name TEXT,
  branch_name TEXT,
  commit_sha TEXT,
  commit_message TEXT,
  commit_author_name TEXT,
  commit_author_email TEXT,
  pr_title TEXT,
  environment TEXT,
  review_context TEXT,
  llm_model TEXT,
  cli_version TEXT,
  diff_lines_added INTEGER DEFAULT 0,
  diff_lines_removed INTEGER DEFAULT 0,
  diff_total_lines INTEGER DEFAULT 0,
  files_changed_count INTEGER DEFAULT 0,
  context_files_count INTEGER DEFAULT 0,
  context_files_total_lines INTEGER DEFAULT 0,
  threadlines_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threadline definitions table - stores deduplicated threadline content
-- Repository-scoped: same threadline_id in different repos = different definitions
-- Account-scoped: definitions belong to an account (for access control)
CREATE TABLE IF NOT EXISTS threadline_definitions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  threadline_id TEXT NOT NULL,
  threadline_file_path TEXT NOT NULL,
  threadline_version TEXT NOT NULL,
  threadline_patterns JSONB NOT NULL,
  threadline_content TEXT NOT NULL,
  repo_name TEXT, -- Repository where this threadline definition exists
  account TEXT NOT NULL, -- Account that owns this threadline definition
  predecessor_id TEXT REFERENCES threadline_definitions(id), -- Optional: points to earlier version
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_threadlines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  check_id TEXT NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  threadline_id TEXT NOT NULL, -- Kept for query convenience
  threadline_definition_id TEXT NOT NULL REFERENCES threadline_definitions(id), -- Reference to definition (contains file_path, patterns, content, version)
  context_files JSONB,
  context_content JSONB,
  relevant_files JSONB, -- Files that matched threadline patterns
  filtered_diff TEXT, -- The actual diff sent to LLM (filtered to only relevant files)
  files_in_filtered_diff JSONB, -- Files actually present in the filtered diff sent to LLM
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  check_threadline_id TEXT NOT NULL REFERENCES check_threadlines(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('compliant', 'attention', 'not_relevant')),
  reasoning TEXT,
  file_references JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_diffs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  check_id TEXT NOT NULL REFERENCES checks(id) ON DELETE CASCADE UNIQUE,
  diff_content TEXT NOT NULL,
  diff_format TEXT DEFAULT 'unified',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit tables
CREATE INDEX IF NOT EXISTS idx_checks_user_id ON checks(user_id);
CREATE INDEX IF NOT EXISTS idx_checks_account ON checks(account);
CREATE INDEX IF NOT EXISTS idx_checks_repo_name ON checks(repo_name);
CREATE INDEX IF NOT EXISTS idx_checks_branch_name ON checks(branch_name);
CREATE INDEX IF NOT EXISTS idx_checks_created_at ON checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_repo_branch ON checks(repo_name, branch_name);
-- Indexes for threadline_definitions
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_threadline_id ON threadline_definitions(threadline_id);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_file_path ON threadline_definitions(threadline_file_path);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_threadline_file ON threadline_definitions(threadline_id, threadline_file_path);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_predecessor ON threadline_definitions(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_repo_name ON threadline_definitions(repo_name);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_account ON threadline_definitions(account);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_account_repo ON threadline_definitions(account, repo_name);
CREATE INDEX IF NOT EXISTS idx_threadline_definitions_created_at ON threadline_definitions(created_at DESC);

-- Indexes for check_threadlines
CREATE INDEX IF NOT EXISTS idx_check_threadlines_check_id ON check_threadlines(check_id);
CREATE INDEX IF NOT EXISTS idx_check_threadlines_threadline_id ON check_threadlines(threadline_id);
CREATE INDEX IF NOT EXISTS idx_check_threadlines_definition_id ON check_threadlines(threadline_definition_id);
CREATE INDEX IF NOT EXISTS idx_check_results_check_threadline_id ON check_results(check_threadline_id);
CREATE INDEX IF NOT EXISTS idx_check_results_status ON check_results(status);
CREATE INDEX IF NOT EXISTS idx_check_results_created_at ON check_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_diffs_check_id ON check_diffs(check_id);

-- Enable RLS on audit tables
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE threadline_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_threadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_diffs ENABLE ROW LEVEL SECURITY;

