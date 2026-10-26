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
