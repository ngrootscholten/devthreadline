# Account/Customer Entity Design Document

## Executive Summary

This document outlines the design for introducing an **Account** (or **Customer**) entity to Threadline. This enables multi-user team collaboration where multiple engineers can share a codebase and view the same threadline checks, while maintaining proper access control and data aggregation.

The Account entity will:
- Own the `THREADLINE_API_KEY` and `THREADLINE_ACCOUNT` identifier
- Enable team collaboration (multiple users per account)
- Serve as the aggregation key for dashboard statistics
- Provide a foundation for future team features (invitations, roles, billing)

---

## 1. Problem Statement

### Current Limitations

1. **Per-User API Keys**: Each user has their own API key stored in `users.api_key_hash`
2. **No Team Collaboration**: Engineers can't easily share threadline checks across a team
3. **Account Field Confusion**: The `checks.account` field stores email/identifier, but there's no proper Account entity
4. **Single-Engineer Focus**: Current model assumes one engineer per codebase

### Use Case: Team Collaboration

**Scenario**: A team of 5 engineers working on the same repository
- All engineers should use the same API key (team key)
- All engineers should see the same threadline checks
- Individual engineers can still be tracked (for commit author, etc.)

---

## 2. System Architecture

### 2.1 Entity Relationship Model

```
┌─────────────────┐
│ threadline_     │
│ accounts        │  (NEW - Team/Organization)
│                 │
│ - id            │
│ - name          │
│ - identifier    │  (THREADLINE_ACCOUNT value)
│ - api_key_hash  │  (THREADLINE_API_KEY hash)
│ - created_at    │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│ users           │
│                 │
│ - id            │
│ - email         │
│ - account_id    │  (NEW - FK to threadline_accounts)
│ - api_key_hash  │  (DEPRECATED - remove eventually)
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│ checks          │
│                 │
│ - id            │
│ - user_id       │  (who ran the check)
│ - account_id    │  (NEW - FK to threadline_accounts)
│ - account       │  (DEPRECATED - will be removed)
└─────────────────┘
```

### 2.2 Key Design Decisions

1. **New Table Name**: `threadline_accounts` (to avoid conflict with NextAuth's `accounts` table)
2. **User-Account Relationship**: Many-to-one (multiple users per account)
3. **Implementation Strategy**: Big bang - account-level authentication from the start
4. **API Key Ownership**: Account owns the API key (not individual users)
5. **Access Control**: Users can only access checks for their account

---

## 3. Database Schema

### 3.1 New Table: `threadline_accounts`

```sql
-- Threadline Accounts table
-- Represents a team/organization/customer
CREATE TABLE IF NOT EXISTS threadline_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,                    -- Display name (e.g., "Acme Corp")
  identifier TEXT UNIQUE NOT NULL,       -- THREADLINE_ACCOUNT value (e.g., "acme-corp")
  api_key_hash TEXT NOT NULL,            -- Hashed API key (SHA256)
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threadline_accounts_identifier ON threadline_accounts(identifier);
CREATE INDEX idx_threadline_accounts_api_key_hash ON threadline_accounts(api_key_hash);
```

### 3.2 User Table Changes

```sql
-- Add account_id to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES threadline_accounts(id) ON DELETE SET NULL;

-- Index for account lookups
CREATE INDEX idx_users_account_id ON users(account_id);
```

**Note**: `users.api_key_hash` will be removed - API keys are account-level only.

### 3.3 Checks Table Changes

```sql
-- Add account_id to checks table
ALTER TABLE checks
ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES threadline_accounts(id) ON DELETE CASCADE;

-- Index for account-based queries
CREATE INDEX idx_checks_account_id ON checks(account_id);
CREATE INDEX idx_checks_account_id_created_at ON checks(account_id, created_at DESC);

-- Note: Existing 'account' TEXT field will be removed after data migration
```

### 3.4 Data Relationships

```
threadline_accounts (1) ──→ (many) users
threadline_accounts (1) ──→ (many) checks
users (1) ──→ (many) checks (via user_id - who ran the check)
```

---

## 4. Implementation Strategy

### 4.1 Big Bang Approach

**Strategy**: Implement account-level authentication from the start. No backward compatibility fallbacks.

**Steps**:
1. Create `threadline_accounts` table
2. Add `account_id` columns to `users` and `checks` (nullable initially)
3. Create indexes
4. Migrate existing data (see Data Migration below)
5. Update authentication to account-level only
6. Remove deprecated fields (`users.api_key_hash`, `checks.account`)

### 4.2 Data Migration

**Goal**: Migrate existing users and checks to accounts before switching authentication.

**Strategy**:
1. For each existing user with `api_key_hash`:
   - Create a `threadline_accounts` record
   - Set `identifier` = user's email (or generate unique identifier)
   - Set `api_key_hash` = user's existing hash
   - Set `users.account_id` = new account id
2. For each existing check:
   - Find account by matching `checks.account` with `threadline_accounts.identifier`
   - Set `checks.account_id` = account id
3. Handle orphaned checks (no matching account):
   - Create default account or mark for manual review

**Migration Script**:
```sql
-- 1. Create accounts by copying data from users table
-- Note: identifier = email (user's email becomes the account identifier, immutable)
INSERT INTO threadline_accounts (name, identifier, api_key_hash, api_key_created_at)
SELECT 
  COALESCE(name, email) as name,
  email as identifier,  -- Email becomes the account identifier (unique, immutable)
  api_key_hash,
  api_key_created_at
FROM users
WHERE api_key_hash IS NOT NULL;

-- 2. Link users to accounts
UPDATE users u
SET account_id = ta.id
FROM threadline_accounts ta
WHERE u.email = ta.identifier AND u.api_key_hash = ta.api_key_hash;

-- 3. Link checks to accounts
UPDATE checks c
SET account_id = u.account_id
FROM users u
WHERE c.user_id = u.id AND u.account_id IS NOT NULL;

-- 4. Handle checks with account field but no user_id (env var auth)
UPDATE checks c
SET account_id = ta.id
FROM threadline_accounts ta
WHERE c.account = ta.identifier AND c.account_id IS NULL;
```

**After Migration**:
1. Remove `users.api_key_hash` column
2. Remove `checks.account` TEXT field
3. Update all queries to use `account_id` only
4. Switch authentication to account-level only (no fallbacks)

---

## 5. API Design

### 5.1 Account Creation

**Endpoint**: `POST /api/account/create`

**Request**:
```typescript
{
  name: string;        // Display name (e.g., "Acme Corp")
  identifier: string; // Unique identifier (e.g., "acme-corp")
}
```

**Response**:
```typescript
{
  account: {
    id: string;
    name: string;
    identifier: string;
    apiKey: string;   // Plain text API key (only shown once!)
    createdAt: string;
  }
}
```

**Flow**:
1. Use user's email as account identifier (already unique, immutable)
2. Generate API key
3. Create `threadline_accounts` record with `identifier = user.email`
4. Link current user to account
5. Return API key (only time it's shown in plain text)

### 5.2 Account Settings

**Endpoint**: `GET /api/account/settings`

**Response**:
```typescript
{
  account: {
    id: string;
    name: string;
    identifier: string;
    apiKeyCreatedAt: string;
    memberCount: number;
    members: Array<{
      id: string;
      email: string;
      name: string;
      joinedAt: string;
    }>;
  }
}
```

**Endpoint**: `PUT /api/account/settings`

**Request**:
```typescript
{
  name?: string;
  // Note: identifier is immutable (set to user's email at account creation)
}
```

### 5.3 API Key Management

**Endpoint**: `POST /api/account/regenerate-api-key`

**Response**:
```typescript
{
  apiKey: string;     // New plain text API key (only shown once!)
  createdAt: string;
}
```

**Security Considerations**:
- Only account owners/admins can regenerate (future: role-based access)
- Old API key is immediately invalidated
- Log key regeneration events

---

## 6. Authentication Changes

### 6.1 Current Flow (User-Level)

```
CLI Request:
  - apiKey: user's API key
  - account: user's email (used as account identifier)

Server:
  1. Look up user by email (account field)
  2. Verify apiKey hash matches user.api_key_hash
  3. Authenticate
```

### 6.2 New Flow (Account-Level)

```
CLI Request:
  - apiKey: account's API key
  - account: account identifier (user's email address)

Server:
  1. Look up account by identifier (email)
  2. Verify apiKey hash matches account.api_key_hash
  3. Find user by account_id (optional - for userId tracking)
  4. Authenticate
```

### 6.3 Authentication Implementation

**Account-Level Only**:
```typescript
async function authenticateRequest(apiKey: string, accountIdentifier: string): Promise<AuthResult> {
  // Look up account by identifier
  const account = await pool.query(
    `SELECT id, api_key_hash FROM threadline_accounts WHERE identifier = $1`,
    [accountIdentifier]
  );
  
  if (account.rows.length === 0) {
    return { authenticated: false, error: 'Account not found' };
  }
  
  const accountHash = account.rows[0].api_key_hash;
  const providedHash = hashApiKey(apiKey);
  
  if (providedHash !== accountHash) {
    return { authenticated: false, error: 'Invalid API key' };
  }
  
  // Find user for userId tracking (optional)
  const user = await pool.query(
    `SELECT id FROM users WHERE account_id = $1 LIMIT 1`,
    [account.rows[0].id]
  );
  
  return {
    authenticated: true,
    accountId: account.rows[0].id,
    userId: user.rows[0]?.id
  };
}
```

---

## 7. Access Control

### 7.1 User Session Enhancement

**Add account_id to session**:
```typescript
// In NextAuth session callback
session.user.accountId = user.account_id;
```

**Update TypeScript types**:
```typescript
// types/next-auth.d.ts
declare module "next-auth" {
  interface User {
    accountId?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      accountId?: string;  // NEW
    };
  }
}
```

---

## 9. CLI Changes

### 9.1 Configuration

**Current**: CLI uses `THREADLINE_ACCOUNT` (email) and `THREADLINE_API_KEY` (user's key)

**New**: CLI uses `THREADLINE_ACCOUNT` (account identifier) and `THREADLINE_API_KEY` (account's key)

**Breaking Change**: After migration, CLI must use account identifier and account API key.

**User Action Required**:
1. After migration, user receives account identifier and API key
2. User updates `.env.local`:
   ```
   THREADLINE_ACCOUNT=acme-corp  # Changed from email
   THREADLINE_API_KEY=new-account-key  # Changed from user key
   ```
3. CLI continues to work with new account-level credentials

---

## 10. UI Changes

### 10.1 Account Creation Page

**Route**: `/account/create`

**Features**:
- Form: Account name, identifier
- Generate API key button
- Display API key (with copy button, warning about one-time display)
- Instructions for updating `.env.local`

### 10.2 Account Settings Page

**Route**: `/account/settings` (enhance existing)

**Features**:
- Display account name and identifier
- Show API key creation date
- Regenerate API key button
- List account members (future)
- Invite members (future)

### 10.3 Dashboard Updates

**Changes**:
- Dashboard queries filter by account (team-wide visibility)
- Show which user ran each check (commit author)
- Filter by user (optional - show team member's checks)

---

## 11. Implementation Phases

### Phase 1: Database Schema (Week 1)
- [ ] Create `threadline_accounts` table
- [ ] Add `account_id` to `users` table (nullable)
- [ ] Add `account_id` to `checks` table (nullable)
- [ ] Create indexes
- [ ] Update `schema.sql`

### Phase 2: Account Creation (Week 1-2)
- [ ] Create `/api/account/create` endpoint
- [ ] Create account creation UI page
- [ ] Generate API keys for accounts
- [ ] Link users to accounts on creation

### Phase 3: Data Migration (Week 2)
- [ ] Create migration script
- [ ] Migrate existing users to accounts
- [ ] Migrate existing checks to accounts
- [ ] Verify data integrity
- [ ] Remove deprecated fields (`users.api_key_hash`, `checks.account`)

### Phase 4: Authentication Updates (Week 2)
- [ ] Update authentication to check account-level API keys only
- [ ] Remove user-level API key authentication
- [ ] Update session to include `accountId`
- [ ] Test account-level authentication

### Phase 5: Account Settings (Week 3)
- [ ] Enhance account settings page
- [ ] Add API key regeneration
- [ ] Add account name/identifier editing
- [ ] Add member list (future: invitations)


---

## 12. Open Questions

1. **Account Naming**: Should identifier be auto-generated or user-provided?
   - **Answer**: User's email address becomes the account identifier (unique, immutable)
   - **Rationale**: Ensures uniqueness (emails are already unique in the system), easy to enforce, immutable
   - **Limitation**: One email = one Threadline account (users cannot have multiple accounts with same email)
   - **Invitation Impact**: When users invite others, those email addresses cannot be used during sign-up (they already have an account)

2. **Account Ownership**: Who can manage account settings?
   - **Answer**: Only the owner user can manage account settings
   - **Implementation**: First user (creator) is owner, add roles later

3. **Account Deletion**: What happens when account is deleted?
   - **Answer**: Account deletion feature will not be provided initially

4. **User Removal**: Can users be removed from accounts?
   - **Answer**: User removal feature will not be provided initially

5. **Account Limits**: Should there be limits (users, checks, etc.)?
   - **Answer**: Not initially, add later if needed for billing

---

## 13. Success Criteria

### 13.1 Functional Requirements
- ✅ Users can create accounts
- ✅ Multiple users can belong to one account
- ✅ API key authentication works at account level
- ✅ Account serves as aggregation key for future dashboard features
- ✅ Account-level authentication implemented from the start

### 13.2 Performance Requirements
- ✅ Account lookups are fast (indexed)
- ✅ Dashboard queries perform well with account_id
- ✅ No degradation in check creation performance

### 13.3 Security Requirements
- ✅ API keys are hashed (never stored in plain text)
- ✅ Users can only access their account's data
- ✅ Account identifiers are validated (prevent injection)

---

## 14. Conclusion

The Account entity provides a solid foundation for team collaboration. The big bang implementation approach ensures a clean architecture with account-level authentication from the start.

This design enables:
- **Team collaboration**: Multiple engineers sharing codebase and checks
- **Future features**: Foundation for invitations, roles, billing, and dashboard statistics

**Next Steps**: Review this document, address open questions, then proceed with Phase 1 implementation.

