---
name: API auth token fix
description: customFetch requires setAuthTokenGetter at module load or all protected routes return 401
---

## Rule
Call `setAuthTokenGetter(() => typeof window !== "undefined" ? localStorage.getItem("nm_token") : null)` at the TOP of `use-auth.tsx` (module level, outside any component).

**Why:** The generated API client checks _authTokenGetter before every request. If null, no Authorization header is sent and the backend rejects all protected routes with 401. This was the root cause of the admin section (and all authenticated data) returning empty results.

**How to apply:** Import `setAuthTokenGetter` from `@workspace/api-client-react` in the auth hook file and call it once at module scope. Must run synchronously before any fetch — not inside a component or useEffect.
