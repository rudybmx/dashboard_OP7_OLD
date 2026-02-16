-- Migration: Create and Populate user_accounts_access Table
-- Purpose: Move from array-based permissions (text[]) to relational table.
-- Also normalizes account IDs by removing 'act_' prefix, aligning with tb_meta_ads_contas.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.user_accounts_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    account_id TEXT NOT NULL, -- Numeric string (no act_ prefix)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Prevent duplicate permission for same user/account
    CONSTRAINT unique_user_account_access UNIQUE (user_email, account_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_access_email ON public.user_accounts_access(user_email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_access_account ON public.user_accounts_access(account_id);

-- 2. Migrate existing data from perfil_acesso
-- We unnest the array and insert each ID, stripping 'act_' if present.
INSERT INTO public.user_accounts_access (user_email, account_id)
SELECT 
    email,
    REGEXP_REPLACE(unnested_id, '^act_', '', 'i') -- Remove 'act_' case-insensitively
FROM perfil_acesso,
LATERAL unnest(assigned_account_ids) AS unnested_id
ON CONFLICT (user_email, account_id) DO NOTHING;

-- 3. Verify migration count (optional check)
-- SELECT COUNT(*) FROM user_accounts_access;
