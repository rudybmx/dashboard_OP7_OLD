# Dashboard OP7 — Architecture Skill

## Purpose
This skill guides Claude through the full architecture, refactoring, and scaling of the Dashboard OP7 project. It enforces Feature-Sliced Design (FSD), fixes known bugs, and documents backend patterns.

## When to use
- Organizing or migrating components/pages
- Fixing the reload/refresh bug
- Managing users, roles, and permissions
- Scaling the Supabase backend
- Adding new views or screens

## Reference project
`D:\QÓZT\PROJETOS DEV\LANDING PAGE\dashboard_meta_google_bihmks` — read this project for evolved patterns before implementing anything in OP7.

## Quick rules
- All new code goes in `src/` under the correct FSD layer
- No prop drilling — widgets consume hooks directly
- All Supabase data access goes through RPCs (never raw table queries from frontend)
- Auth role checks happen in `useUserAccess.ts`, never inline in components
- The `components/` and root `lib/` folders are deprecated — migrate, don't add to them
