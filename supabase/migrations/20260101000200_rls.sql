-- AI Credits Demo — Row Level Security.
-- Safe to re-run (drops existing policies before creating them).

alter table public.profiles           enable row level security;
alter table public.referral_codes     enable row level security;
alter table public.referrals          enable row level security;
alter table public.referral_events    enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.rate_limits        enable row level security;

alter table public.profiles           force row level security;
alter table public.referral_codes     force row level security;
alter table public.referrals          force row level security;
alter table public.referral_events    force row level security;
alter table public.challenge_progress force row level security;
alter table public.rate_limits        force row level security;

-- Start from zero privileges for API roles.
revoke all on public.profiles, public.referral_codes, public.referrals,
              public.referral_events, public.challenge_progress, public.rate_limits
  from anon, authenticated;

-- profiles: a user sees and edits only their own row, and only display_name.
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- referral_codes: owners may read their own code. No insert/update/delete,
-- and no way to list other people's codes (prevents enumeration).
grant select on public.referral_codes to authenticated;
drop policy if exists referral_codes_select_own on public.referral_codes;
create policy referral_codes_select_own on public.referral_codes
  for select to authenticated using (owner_id = (select auth.uid()));

-- challenge_progress: owners may read their own row; completion is server-only.
grant select on public.challenge_progress to authenticated;
drop policy if exists challenge_progress_select_own on public.challenge_progress;
create policy challenge_progress_select_own on public.challenge_progress
  for select to authenticated using (owner_id = (select auth.uid()));

-- referrals, referral_events, rate_limits: RLS enabled, NO policies and no grants
-- => inaccessible to anon/authenticated. Only service_role (Edge Functions) may touch them.

grant select, insert, update, delete on
  public.profiles, public.referral_codes, public.referrals,
  public.referral_events, public.challenge_progress, public.rate_limits
to service_role;
