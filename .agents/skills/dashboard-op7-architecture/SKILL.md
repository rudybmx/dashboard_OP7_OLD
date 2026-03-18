# Skill: Dashboard OP7 — Architecture & Scalability

## Trigger
Use this skill when the user asks to:
- Organize, refactor, or restructure the project
- Fix the reload/refresh bug
- Add or manage users, roles, or access levels
- Scale the backend (Supabase)
- Migrate to FSD or improve component organization
- Add new pages or screens
- Fix auth issues or permission bugs

---

## Project Context

**Stack:** React 19 + TypeScript + Vite + Supabase (PostgreSQL) + TailwindCSS + Shadcn/Radix UI
**Architecture Target:** Feature-Sliced Design (FSD)
**Auth:** Email/password via Supabase, session in localStorage (`op7_local_session`)
**Backend:** Supabase-only (no custom server) — RPCs, views, RLS policies
**Supabase instance:** `eylnuxgwxlhyasigvzdj.supabase.co`
**Reference project:** `D:\QÓZT\PROJETOS DEV\LANDING PAGE\dashboard_meta_google_bihmks` (more evolved FSD architecture — use as reference for patterns)

---

## Target Directory Structure (FSD)

```
src/
├── auth/                          # Auth logic (keep as-is, enhance)
│   ├── AuthProvider.tsx
│   ├── types.ts
│   ├── useAuth.ts
│   └── useUserAccess.ts
├── entities/                      # Business domain data + hooks
│   ├── finance/
│   │   ├── api/useFinanceData.ts
│   │   ├── lib/calculations.ts
│   │   ├── model/types.ts
│   │   └── index.ts
│   ├── account/
│   │   ├── api/useAccounts.ts
│   │   ├── model/types.ts
│   │   └── index.ts
│   └── user/
│       ├── api/useUsers.ts
│       ├── model/types.ts
│       └── index.ts
├── features/                      # User-facing feature modules
│   ├── filters/
│   │   ├── model/useFilters.tsx   # Context provider for global filters
│   │   └── index.ts
│   ├── auth-gate/
│   │   ├── ui/ProtectedRoute.tsx
│   │   └── index.ts
│   └── user-management/
│       ├── ui/UsersSettingsTab.tsx
│       └── index.ts
├── pages/                         # Full page components
│   ├── DashboardOverview.tsx
│   ├── SummaryView.tsx
│   ├── ManagerialView.tsx
│   ├── CampaignsView.tsx
│   ├── CreativesView.tsx
│   ├── DemographicsGeoView.tsx
│   ├── AdsTableView.tsx
│   ├── PlanningDashboardView.tsx
│   ├── SettingsView.tsx
│   └── LoginView.tsx
├── widgets/                       # Complex self-contained UI blocks
│   ├── KPISection/
│   │   ├── index.tsx
│   │   └── model/
│   ├── MainCharts/
│   │   ├── index.tsx
│   │   └── model/chartDataMapper.ts
│   ├── Sidebar/
│   │   └── index.tsx
│   └── DashboardHeader/
│       └── index.tsx
└── shared/                        # Pure utilities, no business logic
    ├── ui/                        # Shadcn/Radix primitives only
    ├── lib/
    │   ├── utils.ts
    │   ├── logger.ts
    │   └── dateUtils.ts
    └── api/
        └── supabaseClient.ts

components/                        # DEPRECATED — migrate to src/ above
services/                          # DEPRECATED — migrate to entities/*/api/
```

---

## 1. FSD Migration Steps

### Phase 1 — Foundation (do first)
1. Create `src/shared/lib/` with copies of `lib/utils.ts`, `lib/logger.ts`, `lib/dateUtils.ts`
2. Create `src/shared/ui/` — move ALL Shadcn/Radix components from `components/ui/`
3. Create `src/shared/api/supabaseClient.ts` — move `services/supabaseClient.ts`
4. Update `tsconfig.json` paths: add `@/src/*` and `@/shared/*` aliases

### Phase 2 — Entities
5. Create `src/entities/finance/api/useFinanceData.ts` — centralize data fetching (copy pattern from reference project)
6. Create `src/entities/account/api/useAccounts.ts` — wraps `fetchMetaAccounts()`
7. Create `src/entities/user/api/useUsers.ts` — wraps `userService.ts`

### Phase 3 — Features
8. Create `src/features/filters/model/useFilters.tsx` — FiltersContext with:
   - `selectedAccount: string` (default: 'ALL')
   - `dateRange: RangeValue`
   - `setSelectedAccount`, `setDateRange`
   - Persist to localStorage
9. Wrap `index.tsx` providers: `ErrorBoundary > QueryClientProvider > AuthProvider > FiltersProvider > App`

### Phase 4 — Pages & Widgets
10. Move page components to `src/pages/` one at a time
11. Move `KPISection`, `MainCharts`, `Sidebar`, `DashboardHeader` to `src/widgets/`
12. Remove prop drilling — widgets consume hooks directly

### Phase 5 — Cleanup
13. Delete duplicate UI files (`button-1.tsx`, `select-1.tsx`)
14. Remove empty `components/` once all migrated
15. Remove root `lib/` once `src/shared/lib/` is canonical

---

## 2. Fix Reload Bug

**Root cause:** On browser reload, the SPA has no server-side routing. The browser requests `/campaigns` or `/settings` but there's no HTML file at that path — Vite's dev server handles this, but production/Vercel does not.

**Also:** Supabase session validation on reload hits a race condition where `AuthProvider` tries to validate before the Supabase client is initialized.

### Fixes:

**A. Vite config — `vite.config.ts`** (already present but verify):
```ts
// Already handled by PWA plugin + SPA fallback
// In dev: server.historyApiFallback is automatic
// In prod: need _redirects or vercel.json
```

**B. Add `vercel.json` at project root:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**C. Fix AuthProvider race condition:**
- Add `initializing` state to `AuthProvider`
- Show global loading spinner while `initializing === true`
- Only render `<App>` after session is resolved

```tsx
// src/auth/AuthProvider.tsx
const [initializing, setInitializing] = useState(true);

useEffect(() => {
  loadSessionFromStorage().finally(() => setInitializing(false));
}, []);

if (initializing) return <FullscreenLoader />;
```

**D. Persist active view to URL hash (optional but recommended):**
```ts
// In App.tsx
const getInitialView = () => {
  const hash = window.location.hash.replace('#', '');
  return VALID_VIEWS.includes(hash) ? hash : 'dashboard';
};
const [activeView, setActiveView] = useState(getInitialView);

const navigate = (view: string) => {
  window.location.hash = view;
  setActiveView(view);
};
```

---

## 3. Users & Access Levels

### Current Roles
| Role | Access |
|------|--------|
| `admin` | All accounts, all views, Settings tab |
| `client` | Only assigned `account_ids`, no Settings |

### Enhanced Role Model (to implement)

**Supabase table: `perfil_acesso`** — add `permissions` JSONB column:
```sql
ALTER TABLE perfil_acesso ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE perfil_acesso ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

**Roles to add:**
| Role | Description | Access |
|------|-------------|--------|
| `superadmin` | Full system access including user management | Everything |
| `admin` | Account + data access, no user management | All views except User Admin |
| `manager` | Assigned accounts, can see executive view | Most views |
| `client` | Assigned accounts only, limited views | Dashboard, Summary |
| `viewer` | Read-only on assigned accounts | Dashboard only |

**`src/auth/types.ts` update:**
```ts
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'client' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  assigned_account_ids: string[];
  is_active: boolean;
  permissions?: {
    canManageUsers?: boolean;
    canExportData?: boolean;
    canViewFinancials?: boolean;
    canEditSettings?: boolean;
  };
}
```

**`src/auth/useUserAccess.ts` update:**
```ts
export function useUserAccess() {
  const { userProfile } = useAuth();

  const isSuperAdmin = userProfile?.role === 'superadmin';
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin';
  const isManager = isAdmin || userProfile?.role === 'manager';
  const isClient = userProfile?.role === 'client';
  const isViewer = userProfile?.role === 'viewer';

  const canManageUsers = isSuperAdmin || userProfile?.permissions?.canManageUsers;
  const canExportData = isManager || userProfile?.permissions?.canExportData;
  const canViewSettings = isAdmin || userProfile?.permissions?.canEditSettings;

  const allowedAccountIds = isAdmin
    ? [] // admin sees all — empty means no filter
    : userProfile?.assigned_account_ids ?? [];

  const filterAccountsByAccess = (accounts: MetaAccount[]) =>
    isAdmin ? accounts : accounts.filter(a => allowedAccountIds.includes(a.account_id));

  return {
    isSuperAdmin, isAdmin, isManager, isClient, isViewer,
    canManageUsers, canExportData, canViewSettings,
    allowedAccountIds,
    filterAccountsByAccess,
  };
}
```

### Protect Views in App.tsx:
```tsx
const ROLE_VIEW_MAP: Record<string, UserRole[]> = {
  dashboard: ['superadmin', 'admin', 'manager', 'client', 'viewer'],
  summary: ['superadmin', 'admin', 'manager', 'client'],
  executive: ['superadmin', 'admin', 'manager'],
  campaigns: ['superadmin', 'admin', 'manager'],
  creatives: ['superadmin', 'admin', 'manager'],
  demographics: ['superadmin', 'admin', 'manager'],
  ads: ['superadmin', 'admin', 'manager'],
  planning: ['superadmin', 'admin'],
  settings: ['superadmin', 'admin'],
};

// Before rendering a view:
if (!ROLE_VIEW_MAP[activeView]?.includes(userProfile.role)) {
  setActiveView('dashboard');
}
```

### UsersSettingsTab — User Management UI:
- List all users from `perfil_acesso` (superadmin only)
- Invite new user: create row in `perfil_acesso` + send Supabase magic link
- Edit role + assigned accounts per user
- Toggle `is_active` (soft delete)

---

## 4. Supabase Backend Scalability

### RLS Policies (Row Level Security)
All tables must have RLS enabled. Pattern:

```sql
-- perfil_acesso: only read own profile
ALTER TABLE perfil_acesso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON perfil_acesso FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON perfil_acesso FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfil_acesso
      WHERE email = auth.jwt() ->> 'email'
      AND role IN ('admin', 'superadmin')
    )
  );
```

### RPCs to Create/Update

**`get_user_profile(p_email TEXT)`** — single source of truth for user auth:
```sql
CREATE OR REPLACE FUNCTION get_user_profile(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT, nome TEXT, role TEXT,
              assigned_account_ids TEXT[], is_active BOOLEAN, permissions JSONB)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, email, nome, role, assigned_account_ids, is_active, permissions
  FROM perfil_acesso
  WHERE email = p_email AND is_active = true;
$$;
```

**`get_dashboard_data(p_email TEXT, p_date_start DATE, p_date_end DATE, p_account_ids TEXT[])`** — secure data gateway:
```sql
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_email TEXT,
  p_date_start DATE,
  p_date_end DATE,
  p_account_ids TEXT[] DEFAULT NULL
)
RETURNS SETOF vw_dashboard_unified
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_assigned_ids TEXT[];
BEGIN
  SELECT role, assigned_account_ids INTO v_role, v_assigned_ids
  FROM perfil_acesso WHERE email = p_email AND is_active = true;

  IF v_role IN ('admin', 'superadmin') THEN
    RETURN QUERY
      SELECT * FROM vw_dashboard_unified
      WHERE date_start BETWEEN p_date_start AND p_date_end
      AND (p_account_ids IS NULL OR account_id = ANY(p_account_ids));
  ELSE
    RETURN QUERY
      SELECT * FROM vw_dashboard_unified
      WHERE date_start BETWEEN p_date_start AND p_date_end
      AND account_id = ANY(v_assigned_ids)
      AND (p_account_ids IS NULL OR account_id = ANY(p_account_ids));
  END IF;
END;
$$;
```

### Indexes for Performance
```sql
CREATE INDEX IF NOT EXISTS idx_vw_dashboard_account_date
  ON vw_dashboard_unified(account_id, date_start);

CREATE INDEX IF NOT EXISTS idx_perfil_email
  ON perfil_acesso(email);

CREATE INDEX IF NOT EXISTS idx_meta_accounts_id
  ON tb_meta_accounts(account_id);
```

### Supabase Edge Functions (optional, for scale)
For heavy aggregations, move to Edge Functions:
- `functions/aggregate-kpi/index.ts` — runs KPI aggregation server-side
- `functions/send-report/index.ts` — scheduled weekly report emails
- `functions/sync-meta-data/index.ts` — cron to pull Meta API data

---

## 5. Component Organization Rules

### Where to put new code:
| What | Where |
|------|-------|
| Supabase client | `src/shared/api/supabaseClient.ts` |
| Shadcn/Radix component | `src/shared/ui/` |
| Pure utility function | `src/shared/lib/` |
| Data fetch hook for a domain | `src/entities/<domain>/api/` |
| Business logic / types | `src/entities/<domain>/model/` |
| Filter/auth/global state | `src/features/<feature>/model/` |
| Complex widget (uses hooks) | `src/widgets/<Widget>/` |
| Full page component | `src/pages/` |
| Auth logic | `src/auth/` |

### Naming conventions:
- Hooks: `use<Name>.ts` (camelCase)
- Components: `PascalCase.tsx`
- Types: `types.ts` in `model/` folder
- Barrel exports: `index.ts` in each FSD layer folder
- Context files: `<Name>Context.tsx` or `use<Name>.tsx` (when hook + context together)

### Import rules:
- `shared` can import nothing from the project
- `entities` can import from `shared` only
- `features` can import from `entities` + `shared`
- `widgets` can import from `features` + `entities` + `shared`
- `pages` can import from everything
- Never import upward in the FSD hierarchy

---

## 6. Adding New Pages/Screens

### Checklist for a new page:
1. Create `src/pages/<PageName>View.tsx`
2. Add view key to `VALID_VIEWS` array in `App.tsx`
3. Add role access to `ROLE_VIEW_MAP` in `App.tsx`
4. Add lazy import: `const PageNameView = lazyWithRetry(() => import('./src/pages/PageNameView'))`
5. Add nav item to `Sidebar.tsx` with role guard
6. Add case to view switch in `App.tsx`
7. Add URL hash mapping

---

## 7. Implementation Priority Order

1. ✅ Fix reload bug (`vercel.json` + AuthProvider `initializing` state)
2. ✅ Fix AuthProvider race condition
3. ✅ Create `src/shared/` layer (non-breaking, additive)
4. ✅ Create `src/features/filters/` (centralize filter state)
5. ✅ Update `UserRole` types + `useUserAccess` hook
6. ✅ Add role guards to views in `App.tsx`
7. ✅ Update Supabase RPCs for secure data access
8. ✅ Migrate pages to `src/pages/` (one at a time)
9. ✅ Migrate widgets to `src/widgets/`
10. ✅ Clean up deprecated files
