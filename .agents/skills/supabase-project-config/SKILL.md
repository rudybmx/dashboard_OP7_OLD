---
name: supabase-project-config
description: Supabase project configuration and database management for Dashboard OP7. This skill MUST be used whenever interacting with Supabase MCP tools, running SQL queries, creating migrations, managing RLS policies, or any database-related operation for this project. It ensures the correct Supabase project is always targeted. Use this skill even if the user doesn't explicitly mention Supabase — if the task involves database tables, RPCs, policies, or the MCP server, this skill applies.
---

# Supabase Project Configuration — Dashboard OP7

This skill ensures that all Supabase MCP operations target the **correct project** and provides a complete reference of the database schema, RPCs, and conventions.

## ⚠️ CRITICAL: Project Identification

This project connects to a **specific** Supabase instance. Using the wrong project will cause silent failures or data corruption.

| Field | Value |
|-------|-------|
| **Correct Project Name** | `Diversos` |
| **Correct Project ID** | `eylnuxgwxlhyasigvzdj` |
| **Region** | `sa-east-1` |
| **Frontend .env variable** | `VITE_SUPABASE_URL=https://eylnuxgwxlhyasigvzdj.supabase.co` |

### Before ANY Supabase MCP call:

1. **Always use project_id `eylnuxgwxlhyasigvzdj`** for all MCP tool calls
2. If you're unsure which project to use, check the `.env` file at the project root for `VITE_SUPABASE_URL`
3. **NEVER use `fnnefzcdnypfxtpisowo`** (that's `qozt_manager`, a completely different project)

### Validation Pattern

Before executing any destructive operation (migrations, DDL, data updates), verify the project:

```
# Confirm by checking a known table exists with expected row count
SELECT count(*) FROM tb_meta_ads_contas;  -- Expected: ~190 rows
SELECT count(*) FROM client_groups;        -- Expected: ~32 rows
```

If the counts are 0 or the tables don't exist, **STOP** — you're likely on the wrong project.

---

## Organization Info

| Field | Value |
|-------|-------|
| **Organization** | `qpgtgyzfwvkmhkouyhbe` |
| **Other project in same org** | `qozt_manager` (`fnnefzcdnypfxtpisowo`) — DO NOT USE for this dashboard |

---

## Database Schema Reference

### Core Tables

#### `tb_meta_ads_contas` (~190 rows) — Meta Ads Accounts
| Column | Type | Description |
|--------|------|-------------|
| `account_id` | text (PK) | Meta Ads account ID |
| `nome_original` | text | Original account name from Meta |
| `nome_ajustado` | text | Custom display name |
| `status_meta` | text | Meta status (ACTIVE, DISABLED, UNSETTLED) |
| `franqueado` | text | Franchise name (legacy) |
| `franqueado_id` | uuid | FK to tb_franqueados |
| `group_id` | uuid | FK to client_groups |
| `categoria_id` | uuid | FK to tb_categorias_clientes |
| `client_visibility` | boolean | Whether visible to client role |
| `status_interno` | text | Internal status (active, removed) |
| `saldo_balanco` | numeric | Current balance |
| `limite_gastos` | numeric | Spending limit |
| `total_gasto` | numeric | Total spent |
| `motivo_bloqueio` | text | Block reason |
| `eh_pre_pago` | text | Pre-paid flag |
| `moeda` | text | Currency |
| `account_id_link` | text | Linked account ID |
| `updated_at` | timestamptz | Last update |

#### `client_groups` (~32 rows) — Account Grouping
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Group ID |
| `name` | text | Group name (e.g., "OP7 \| SÃO CARLOS") |
| `description` | text | Optional description |
| `type` | text | franchise, brand, agency, region, custom, other |
| `is_active` | boolean | Soft delete flag |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Auto-updated via trigger |

**RLS:** Enabled — policies allow full CRUD for `anon` and `authenticated`

#### `ads_insights` — Ad performance data
Primary data source for dashboard metrics. Indexed by `account_id` + `date_start`.

#### `perfil_acesso` — User profiles & authentication
Custom auth system (not Supabase Auth). Fields: `id`, `email`, `nome`, `role`, `password`, `permissions` (JSONB), `is_active`, `assigned_account_ids`.

#### `tb_franqueados` — Franchises (legacy)
Being replaced by `client_groups`. Still referenced by `franqueado_id` in `tb_meta_ads_contas`.

#### `user_accounts_access` — Account-level permissions
Maps users to specific accounts with access levels.

### Other Tables (not directly related to dashboard filters)
- `tb_categorias_clientes` — Client categories
- `tb_planejamento_metas` — Goal planning

---

## RPCs (Remote Procedure Calls)

### `set_accounts_group(p_group_id uuid, p_account_ids text[])`
- **Purpose:** Link/unlink accounts to a client group
- **Security:** `SECURITY DEFINER` (bypasses RLS)
- **Permissions:** `anon`, `authenticated`
- **Usage:**
  - Link accounts: pass array of account_ids
  - Unlink all: pass empty array `ARRAY[]::text[]`
  - Called before deleting a group to clean up references

### `get_all_meta_accounts(p_user_email text DEFAULT NULL)`
- **Purpose:** Returns all visible Meta accounts with group/franchise info
- **Security:** `SECURITY DEFINER`
- **Returns:** account_id, account_name, display_name, franchise_id, franchise_name, group_id, group_name, categoria_id, current_balance, status, client_visibility, status_meta, motivo_bloqueio, total_gasto

### `authenticate_user(p_email text, p_password text)`
- **Purpose:** Custom authentication (not Supabase Auth)
- **Returns:** id, email, nome, role, permissions, created_at

### `get_user_assigned_accounts(p_user_email text)`
- **Purpose:** Returns account_ids accessible by a user based on role
- **Admin/superadmin:** All accounts
- **Other roles:** Only explicitly assigned accounts

### `get_kpi_comparison(...)` / `get_managerial_data(...)`
- **Purpose:** Dashboard data aggregation RPCs
- **Parameters:** p_start_date, p_end_date, p_user_email, p_franchise_filter, p_account_filter

---

## Migration Conventions

When creating migrations for this project:

1. **File naming:** `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. **Always use `CREATE OR REPLACE`** for functions
3. **Always use `IF NOT EXISTS`** for tables and columns
4. **Always include `GRANT EXECUTE`** for `anon` and `authenticated` on new functions
5. **Always end with `NOTIFY pgrst, 'reload schema';`** to refresh PostgREST cache
6. **Always test** the migration with a SELECT query after applying

### Example migration template:
```sql
-- Migration: description_here
-- Project: Diversos (eylnuxgwxlhyasigvzdj)

CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- logic here
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_function(...) TO anon;
GRANT EXECUTE ON FUNCTION public.my_function(...) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

---

## Auth System

This project uses **custom authentication** (not Supabase Auth):
- Login via `authenticate_user` RPC (email + password)
- Session stored in `localStorage` as `op7_local_session`
- `auth.uid()` is always NULL — all security goes through `SECURITY DEFINER` RPCs
- User email extracted via `localStorage.getItem('op7_local_session')`

---

## Common Pitfalls

1. **Wrong project ID** — Always double-check you're using `eylnuxgwxlhyasigvzdj`
2. **PostgREST cache** — After creating/modifying functions, always run `NOTIFY pgrst, 'reload schema'`
3. **RLS blocking writes** — Use `SECURITY DEFINER` functions to bypass RLS when needed
4. **Column name mismatches** — `tb_meta_ads_contas` uses `nome_original`/`nome_ajustado`, but frontend expects `account_name`/`display_name` (mapped via RPC)
5. **Custom auth** — Don't use `auth.uid()` or `auth.jwt()` in policies — they're always NULL
