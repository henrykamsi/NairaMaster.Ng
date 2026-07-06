---
name: Admin account and DB defaults
description: How the admin account was created and score default set
---

## Admin account
- Email: kamsih924@gmail.com, is_admin=true, seeded via direct SQL INSERT with bcrypt hash
- Hash computed via: `pnpm --filter @workspace/api-server exec node -e "const bc=require('bcryptjs');bc.hash('350568',10).then(h=>console.log(h))"`
- ON CONFLICT (email) DO UPDATE — safe to re-run

## Score default
- Changed from 100 to 30 via `ALTER TABLE users ALTER COLUMN score SET DEFAULT 30;`

## VAPID keys (push notifications)
- Public key hardcoded in push.ts and Shell.tsx (user declined env var flow)
- User should set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as secrets for production
- push_subscriptions table created at runtime in push.ts via CREATE TABLE IF NOT EXISTS
