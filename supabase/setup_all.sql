-- AI Credits Demo — core schema.
-- Participants are Supabase *anonymous* auth users (server-issued UUID + JWT),
-- so every table can reference auth.users(id) and no separate trust model is needed.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 40),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------- referral_codes
create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-HJ-KM-NP-Z2-9]{10}$'),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
-- At most one active code per participant.
create unique index if not exists referral_codes_one_active_per_owner
  on public.referral_codes (owner_id) where active;

-- --------------------------------------------------------------- referrals
create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending', 'verified', 'rejected')),
  created_at       timestamptz not null default now(),
  verified_at      timestamptz,
  -- A participant can be attributed to exactly one referrer, ever.
  constraint referrals_one_attribution_per_user unique (referred_user_id),
  constraint referrals_verified_has_timestamp
    check ((status = 'verified') = (verified_at is not null))
);
create index if not exists referrals_code_status_idx on public.referrals (referral_code_id, status);

-- Defence in depth: forbid self-referral even if a function is bypassed.
create or replace function public.referrals_block_self_referral() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from public.referral_codes rc
    where rc.id = new.referral_code_id and rc.owner_id = new.referred_user_id
  ) then
    raise exception 'self referral is not allowed' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists referrals_no_self_referral on public.referrals;
create trigger referrals_no_self_referral
  before insert or update of referral_code_id, referred_user_id on public.referrals
  for each row execute function public.referrals_block_self_referral();

-- Once verified, a referral can never go back.
create or replace function public.referrals_freeze_verified() returns trigger
language plpgsql as $$
begin
  if old.status = 'verified' and new.status <> 'verified' then
    raise exception 'verified referrals are immutable' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists referrals_verified_immutable on public.referrals;
create trigger referrals_verified_immutable
  before update on public.referrals
  for each row execute function public.referrals_freeze_verified();

-- --------------------------------------------------------- referral_events
create table if not exists public.referral_events (
  id          uuid primary key default gen_random_uuid(),
  referral_id uuid references public.referrals(id) on delete cascade,
  event_type  text not null check (event_type in ('attributed', 'verified', 'rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists referral_events_referral_idx on public.referral_events (referral_id);

-- ------------------------------------------------------ challenge_progress
create table if not exists public.challenge_progress (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  challenge_type text not null default 'five_referrals',
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  constraint challenge_progress_owner_type_key unique (owner_id, challenge_type)
);

-- ------------------------------------------------------------- rate limits
create table if not exists public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------- profile auto-provisioning
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- AI Credits Demo — trusted server-side functions.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Tunables -------------------------------------------------------------
-- Minimum seconds between attribution and verification (anti-scripting).
-- Accounts older than 24h are not "newly registered" and cannot be attributed.

-- ------------------------------------------------------------ rate limit
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  return v_hits <= p_max;
end $$;

-- -------------------------------------------------------------- progress
create or replace function public.get_challenge_progress(p_owner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_verified integer;
  v_pending  integer;
  v_target   constant integer := 5;
  v_completed timestamptz;
  v_slots jsonb;
begin
  select count(*) filter (where r.status = 'verified'),
         count(*) filter (where r.status = 'pending')
    into v_verified, v_pending
  from public.referrals r
  join public.referral_codes c on c.id = r.referral_code_id
  where c.owner_id = p_owner;

  select completed_at into v_completed
  from public.challenge_progress
  where owner_id = p_owner and challenge_type = 'five_referrals';

  select jsonb_agg(jsonb_build_object(
           'slot', s,
           'status', case when s <= v_verified then 'verified' else 'pending' end)
         order by s)
    into v_slots
  from generate_series(1, v_target) s;

  return jsonb_build_object(
    'verified', least(v_verified, v_target),
    'pendingAwaitingVerification', v_pending,
    'target', v_target,
    'completed', v_completed is not null,
    'completedAt', v_completed,
    'slots', v_slots
  );
end $$;

-- Sets completed_at iff the owner really has >= 5 verified referrals.
create or replace function public.complete_challenge_if_eligible(p_owner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_verified integer;
begin
  select count(*) into v_verified
  from public.referrals r
  join public.referral_codes c on c.id = r.referral_code_id
  where c.owner_id = p_owner and r.status = 'verified';

  if v_verified >= 5 then
    insert into public.challenge_progress (owner_id, challenge_type, completed_at)
    values (p_owner, 'five_referrals', now())
    on conflict (owner_id, challenge_type)
    do update set completed_at = coalesce(public.challenge_progress.completed_at, excluded.completed_at);
  end if;

  return public.get_challenge_progress(p_owner);
end $$;

-- ------------------------------------------------------------ attribution
create or replace function public.attribute_referral(p_code text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code public.referral_codes;
  v_created timestamptz;
  v_ref uuid;
begin
  select created_at into v_created from auth.users where id = p_user;
  if v_created is null then
    return jsonb_build_object('result', 'unknown_user');
  end if;
  if v_created < now() - interval '24 hours' then
    return jsonb_build_object('result', 'not_eligible');
  end if;

  select * into v_code from public.referral_codes where code = p_code and active;
  if not found then
    return jsonb_build_object('result', 'invalid_code');
  end if;
  if v_code.owner_id = p_user then
    return jsonb_build_object('result', 'self_referral');
  end if;

  insert into public.referrals (referral_code_id, referred_user_id)
  values (v_code.id, p_user)
  on conflict (referred_user_id) do nothing
  returning id into v_ref;

  if v_ref is null then
    return jsonb_build_object('result', 'already_attributed');
  end if;

  insert into public.referral_events (referral_id, event_type) values (v_ref, 'attributed');
  return jsonb_build_object('result', 'attributed');
end $$;

-- ------------------------------------------------------------ verification
create or replace function public.verify_referral(p_user uuid, p_acknowledged boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ref public.referrals;
  v_owner uuid;
begin
  select * into v_ref from public.referrals where referred_user_id = p_user for update;
  if not found then
    return jsonb_build_object('result', 'no_referral');
  end if;
  if v_ref.status = 'verified' then
    return jsonb_build_object('result', 'already_verified');
  end if;
  if v_ref.status <> 'pending' then
    return jsonb_build_object('result', 'not_eligible');
  end if;
  if not coalesce(p_acknowledged, false) then
    return jsonb_build_object('result', 'acknowledgement_required');
  end if;
  if not exists (select 1 from public.referral_codes where owner_id = p_user) then
    return jsonb_build_object('result', 'onboarding_incomplete');
  end if;
  if now() < v_ref.created_at + interval '20 seconds' then
    return jsonb_build_object('result', 'too_early');
  end if;

  update public.referrals set status = 'verified', verified_at = now() where id = v_ref.id;
  insert into public.referral_events (referral_id, event_type) values (v_ref.id, 'verified');

  select owner_id into v_owner from public.referral_codes where id = v_ref.referral_code_id;
  perform public.complete_challenge_if_eligible(v_owner);

  return jsonb_build_object('result', 'verified');
end $$;

-- Status of the caller as a referred participant (no info about the referrer).
create or replace function public.get_attribution_status(p_user uuid) returns text
language sql security definer set search_path = public as $$
  select status from public.referrals where referred_user_id = p_user;
$$;

-- ------------------------------------------ authenticated client RPC wrappers
create or replace function public.rpc_create_referral_code() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_candidate text;
  v_i int;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.check_rate_limit('create-code:u:' || v_uid::text, 20, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select code into v_code from public.referral_codes where owner_id = v_uid and active limit 1;
  if v_code is not null then
    return jsonb_build_object('code', v_code);
  end if;

  for attempt in 1..5 loop
    v_candidate := '';
    for v_i in 1..10 loop
      v_candidate := v_candidate || substr(v_alphabet, 1 + floor(random() * 31)::int, 1);
    end loop;
    begin
      insert into public.referral_codes (owner_id, code) values (v_uid, v_candidate);
      return jsonb_build_object('code', v_candidate);
    exception when unique_violation then
      select code into v_code from public.referral_codes where owner_id = v_uid and active limit 1;
      if v_code is not null then
        return jsonb_build_object('code', v_code);
      end if;
    end;
  end loop;

  raise exception 'could_not_create_code' using errcode = 'P0001';
end $$;

create or replace function public.rpc_attribute_referral(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := upper(trim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.check_rate_limit('attribute:u:' || v_uid::text, 10, 60) then
    return jsonb_build_object('result', 'rate_limited');
  end if;
  if v_clean !~ '^[A-HJ-KM-NP-Z2-9]{10}$' then
    return jsonb_build_object('result', 'invalid_code');
  end if;
  return public.attribute_referral(v_clean, v_uid);
end $$;

create or replace function public.rpc_verify_referral(p_acknowledged boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.check_rate_limit('verify:u:' || v_uid::text, 10, 60) then
    return jsonb_build_object('result', 'rate_limited');
  end if;
  return public.verify_referral(v_uid, p_acknowledged);
end $$;

create or replace function public.rpc_get_challenge_progress() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prog jsonb;
  v_attr text;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.check_rate_limit('progress:u:' || v_uid::text, 60, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  v_prog := public.get_challenge_progress(v_uid);
  v_attr := public.get_attribution_status(v_uid);
  return v_prog || jsonb_build_object('myAttribution', v_attr);
end $$;

create or replace function public.rpc_get_challenge_status() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prog jsonb;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.check_rate_limit('status:u:' || v_uid::text, 60, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  v_prog := public.complete_challenge_if_eligible(v_uid);
  return jsonb_build_object(
    'completed', coalesce((v_prog->>'completed')::boolean, false),
    'verified', (v_prog->>'verified')::int,
    'target', (v_prog->>'target')::int,
    'completedAt', v_prog->'completedAt'
  );
end $$;

-- ------------------------------------------------------------ privileges
revoke all on function
  public.check_rate_limit(text, integer, integer),
  public.get_challenge_progress(uuid),
  public.complete_challenge_if_eligible(uuid),
  public.attribute_referral(text, uuid),
  public.verify_referral(uuid, boolean),
  public.get_attribution_status(uuid),
  public.rpc_create_referral_code(),
  public.rpc_attribute_referral(text),
  public.rpc_verify_referral(boolean),
  public.rpc_get_challenge_progress(),
  public.rpc_get_challenge_status()
from public, anon, authenticated;

grant execute on function
  public.check_rate_limit(text, integer, integer),
  public.get_challenge_progress(uuid),
  public.complete_challenge_if_eligible(uuid),
  public.attribute_referral(text, uuid),
  public.verify_referral(uuid, boolean),
  public.get_attribution_status(uuid)
to service_role;

grant execute on function
  public.rpc_create_referral_code(),
  public.rpc_attribute_referral(text),
  public.rpc_verify_referral(boolean),
  public.rpc_get_challenge_progress(),
  public.rpc_get_challenge_status()
to authenticated, service_role;
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
