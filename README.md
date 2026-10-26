# AI Credits Demo

> **Unofficial interactive demo. No real Google Flow credits are issued.**
> Not affiliated with, sponsored by, or endorsed by Google or Google Flow. The "1,00,000 AI credits" are **simulated**.

A React + Supabase referral-challenge simulator: visitors get a unique referral link, friends join through it, the **server** verifies each referral, and five verified referrals complete the challenge. A separate, clearly labeled local simulation (`/demo`) never touches real referral data.

**Stack:** React 19, Vite, TypeScript, Tailwind CSS 3, React Router, Framer Motion, Lucide · Supabase (Postgres, Auth, Edge Functions, RLS) · Vercel.

## Run locally

Requires **Node.js 20.19+** (Vite 8 / Vitest 5 do not run on Node 14/16/18).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Without Supabase variables the landing, About, Privacy and `/demo` simulation work; `/challenge` and `/success` show a helpful "Backend not configured" error.

Other commands: `npm run build` (typecheck + production build → `dist/`), `npm run preview`, `npm test`.

## Architecture & security model

- **Participants** are Supabase *anonymous* auth users (`signInAnonymously`): a server-issued UUID + JWT, no sign-up form, persisted in `localStorage`.
- **Tables** (`supabase/migrations`): `profiles`, `referral_codes`, `referrals`, `referral_events`, `challenge_progress`, plus `rate_limits`. UUID keys, FKs, unique constraints (`referrals.referred_user_id` is unique → one attribution per participant ever), indexes, and triggers that block self-referral and make verified referrals immutable.
- **RLS** is enabled and forced on every table. Clients can only `select` their own profile / code / challenge row (and update their own `display_name`). `referrals`, `referral_events` and `rate_limits` have no policies and no grants → unreachable from the browser. No client can insert referrals, set `verified`, set counts, or set `completed_at`; codes can't be enumerated.
- **Trusted SQL functions** (`SECURITY DEFINER`, executable by `service_role` only) hold the logic: `attribute_referral`, `verify_referral`, `complete_challenge_if_eligible`, `get_challenge_progress`, `check_rate_limit`.
- **Edge Functions** authenticate the JWT (`auth.getUser`), apply per-user and per-IP-hash rate limits, validate input, return safe errors, and use an `ALLOWED_ORIGINS` CORS allow-list. The service-role key only exists in the Edge Functions environment — never in a `VITE_` variable.

| Function | Purpose |
|---|---|
| `create-referral-code` | Creates/returns the caller's code (CSPRNG, rejection sampling) and URL. |
| `attribute-referral` | Records a *pending* referral for the caller. Rejects invalid codes, self-referrals, duplicates, accounts older than 24h. |
| `verify-referral` | Verifies the **caller's own** referral. No user id accepted from the client. |
| `get-challenge-progress` | Caller's verified count, target (5), slots, completion. |
| `get-challenge-status` | Server-calculated completion; gates `/success`. |

### What counts as a verified referral
A friend is verified only when the server confirms **all** of: they're a new participant (<24h) attributed to a valid, non-self code; they ticked the "simulated demo" acknowledgement; they generated their own referral link (i.e. used the demo); and ≥20 seconds passed since attribution. Page visits and share-button clicks never count.

> **Known limitation:** anonymous accounts are cheap to create, so a determined person can farm accounts. Rate limits and the checks above raise the cost but can't eliminate it. For a stricter deployment, require a permanent account (e.g. email/OTP) inside `verify_referral`.

## Configure Supabase

1. Create a project at supabase.com.
2. **Auth → Sign In / Providers → enable "Allow anonymous sign-ins"** (required).
3. Apply migrations, in order (`supabase/migrations/*.sql`) — either:
   - SQL editor: paste and run each file in order, **or**
   - CLI: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
4. Set Edge Function secrets (the `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` secrets are provided automatically):
   ```bash
   npx supabase secrets set APP_URL=https://YOUR-DOMAIN.vercel.app ALLOWED_ORIGINS=https://YOUR-DOMAIN.vercel.app,http://localhost:5173
   ```
5. Deploy the functions:
   ```bash
   npx supabase functions deploy create-referral-code attribute-referral verify-referral get-challenge-progress get-challenge-status
   ```
6. Put the project URL and **publishable (anon) key** in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Set `VITE_APP_URL` to your production domain so referral links use it.

> Consider enabling CAPTCHA (Auth → Attack Protection) to harden anonymous sign-ins.

## Deploy on Vercel

1. Push to GitHub: `git init && git add . && git commit -m "AI Credits Demo" && git remote add origin <repo-url> && git push -u origin main`.
2. In Vercel: **Add New → Project → Import** the GitHub repo. Framework preset **Vite** is auto-detected; build `npm run build`, output `dist` (also set in `vercel.json`).
3. Add environment variables (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_URL` (your Vercel domain, no trailing slash).
4. Deploy. `vercel.json` rewrites every path to `index.html`, so direct visits to `/challenge`, `/about`, `/success` work; unknown paths render the in-app 404 page.
5. Add the final domain to `ALLOWED_ORIGINS` and `APP_URL` in Supabase secrets (step 4 above) and redeploy functions if you change them.

## Testing

`npm test` runs 29 tests:
- **`src/test/sql.test.ts`** executes the real migrations on an in-process Postgres (PGlite) with stubbed Supabase roles/`auth.uid()`: invalid codes, self-referral, duplicates, verification rules, 4-vs-5 completion, RLS denials (clients can't write referrals/counts/completion, can't enumerate codes), function privileges, rate limiter.
- **`src/test/app.test.tsx`**: referral URL/code handling, WhatsApp/Telegram links & message, clipboard copy + fallback, simulation isolation, missing-config error on `/challenge` and `/success`, landing page.

### Not verified in this environment
Edge Functions, a live Supabase project, a Vercel deployment, and browser Web Share were **not** run here (no Supabase CLI/Deno/Docker daemon, no project credentials). Their logic is exercised only indirectly (SQL functions are tested; the TypeScript wrappers are not). Test them end-to-end after setup:
1. Open `/challenge` in browser A → copy link. 2. Open it in a private window B → confirm participation (after ~20s). 3. Repeat with 5 profiles → `/success` unlocks; with fewer it redirects to `/challenge`.

## Remaining manual steps
Create the Supabase project, enable anonymous sign-ins, apply migrations, set secrets, deploy functions, set Vercel env vars, and review the Privacy page for your legal needs.

