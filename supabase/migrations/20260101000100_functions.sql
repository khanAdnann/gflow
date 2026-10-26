-- AI Credits Demo — trusted server-side functions.
-- All of these are SECURITY DEFINER and executable ONLY by service_role
-- (i.e. by Edge Functions after they authenticate the caller's JWT).

create index rate_limits_window_idx on public.rate_limits (window_start);

-- Tunables -------------------------------------------------------------
-- Minimum seconds between attribution and verification (anti-scripting).
-- Accounts older than 24h are not "newly registered" and cannot be attributed.

-- ------------------------------------------------------------ rate limit
create function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
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
create function public.get_challenge_progress(p_owner uuid) returns jsonb
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
create function public.complete_challenge_if_eligible(p_owner uuid) returns jsonb
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
create function public.attribute_referral(p_code text, p_user uuid) returns jsonb
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
-- Qualifying action for the REFERRED participant (all must hold):
--   1. they were attributed to a referral code (pending referral exists),
--   2. they explicitly acknowledged the "simulated demo" notice (p_acknowledged),
--   3. they generated their own referral code (i.e. actually used the demo), and
--   4. at least 20 seconds passed since attribution.
-- The caller's identity comes from the verified JWT, never from request input.
create function public.verify_referral(p_user uuid, p_acknowledged boolean) returns jsonb
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
create function public.get_attribution_status(p_user uuid) returns text
language sql security definer set search_path = public as $$
  select status from public.referrals where referred_user_id = p_user;
$$;

-- ------------------------------------------------------------ privileges
revoke all on function
  public.check_rate_limit(text, integer, integer),
  public.get_challenge_progress(uuid),
  public.complete_challenge_if_eligible(uuid),
  public.attribute_referral(text, uuid),
  public.verify_referral(uuid, boolean),
  public.get_attribution_status(uuid)
from public, anon, authenticated;

grant execute on function
  public.check_rate_limit(text, integer, integer),
  public.get_challenge_progress(uuid),
  public.complete_challenge_if_eligible(uuid),
  public.attribute_referral(text, uuid),
  public.verify_referral(uuid, boolean),
  public.get_attribution_status(uuid)
to service_role;

