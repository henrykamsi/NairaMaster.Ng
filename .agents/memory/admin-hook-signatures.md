---
name: Admin hook call signatures
description: Generated React Query hooks — options go in second arg, not first
---

## Rule
Generated hooks follow `useHook(params?, options?)`. Never pass `{ query: { queryKey: [...] } }` as the first argument — that slot is for API query params (search/filter strings).

**Why:** Passing options as params silently sends garbage query params to the backend and overrides the correct internal query key, causing cache misses and broken invalidation.

**How to apply:** For admin hooks with no required params, just call `useAdminGetUsers()` with no arguments. Use `qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() })` for invalidation — never hardcode string query keys.
