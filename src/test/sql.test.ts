// @vitest-environment node
// Runs the REAL migrations against an in-process Postgres (PGlite) with minimal Supabase
// stubs (roles, auth.users, auth.uid()). Verifies constraints, trusted functions and RLS.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase", "migrations");
let db: PGlite;

const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const as = async (role: "anon" | "authenticated" | "service_role", sub?: string) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
};
const asAdmin = () => db.exec("reset role;");
const rpc = async (fn: string, args: string) => {
  const r = await db.query<{ r: Record<string, unknown> }>(`select public.${fn}(${args}) as r`);
  return r.rows[0].r;
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant select on auth.users to service_role;
  `);
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, f), "utf8"));
  for (let i = 1; i <= 12; i++) await db.exec(`insert into auth.users (id) values ('${uid(i)}')`);
  // user 1 owns a code; users 2..12 will be referred
  await db.exec(`insert into public.referral_codes (owner_id, code) values ('${uid(1)}', 'ABCDEFGH23')`);
});

describe("schema & triggers", () => {
  it("auto-creates profiles for new auth users", async () => {
    const r = await db.query("select count(*)::int as n from public.profiles");
    expect((r.rows[0] as { n: number }).n).toBe(12);
  });
  it("rejects malformed codes and a second active code per owner", async () => {
    await expect(db.exec(`insert into public.referral_codes (owner_id, code) values ('${uid(2)}', 'bad')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.referral_codes (owner_id, code) values ('${uid(1)}', 'ZZZZZZZZ22')`)).rejects.toThrow();
  });
  it("blocks self-referral at the table level", async () => {
    const id = (await db.query<{ id: string }>(`select id from public.referral_codes where owner_id='${uid(1)}'`)).rows[0].id;
    await expect(db.exec(`insert into public.referrals (referral_code_id, referred_user_id) values ('${id}', '${uid(1)}')`)).rejects.toThrow(/self referral/);
  });
});

describe("attribute_referral", () => {
  it("rejects invalid codes and self-referrals", async () => {
    expect(await rpc("attribute_referral", `'ZZZZZZZZ22', '${uid(2)}'`)).toEqual({ result: "invalid_code" });
    expect(await rpc("attribute_referral", `'ABCDEFGH23', '${uid(1)}'`)).toEqual({ result: "self_referral" });
  });
  it("attributes once; repeats and other codes don't create duplicates", async () => {
    expect(await rpc("attribute_referral", `'ABCDEFGH23', '${uid(2)}'`)).toEqual({ result: "attributed" });
    expect(await rpc("attribute_referral", `'ABCDEFGH23', '${uid(2)}'`)).toEqual({ result: "already_attributed" });
    const n = (await db.query<{ n: number }>("select count(*)::int as n from public.referrals where referred_user_id=$1", [uid(2)])).rows[0].n;
    expect(n).toBe(1);
  });
  it("rejects accounts older than 24h", async () => {
    await db.exec(`update auth.users set created_at = now() - interval '2 days' where id='${uid(12)}'`);
    expect(await rpc("attribute_referral", `'ABCDEFGH23', '${uid(12)}'`)).toEqual({ result: "not_eligible" });
  });
});

describe("verify_referral", () => {
  it("enforces acknowledgement, onboarding, delay, then verifies exactly once", async () => {
    const u = uid(2);
    expect(await rpc("verify_referral", `'${uid(9)}', true`)).toEqual({ result: "no_referral" });
    expect(await rpc("verify_referral", `'${u}', false`)).toEqual({ result: "acknowledgement_required" });
    expect(await rpc("verify_referral", `'${u}', true`)).toEqual({ result: "onboarding_incomplete" });
    await db.exec(`insert into public.referral_codes (owner_id, code) values ('${u}', 'KKKKKKKK22')`);
    expect(await rpc("verify_referral", `'${u}', true`)).toEqual({ result: "too_early" });
    await db.exec(`update public.referrals set created_at = now() - interval '1 minute' where referred_user_id='${u}'`);
    expect(await rpc("verify_referral", `'${u}', true`)).toEqual({ result: "verified" });
    expect(await rpc("verify_referral", `'${u}', true`)).toEqual({ result: "already_verified" });
    expect((await rpc("get_challenge_progress", `'${uid(1)}'`)).verified).toBe(1);
  });
  it("verified referrals are immutable", async () => {
    await expect(db.exec(`update public.referrals set status='pending', verified_at=null where referred_user_id='${uid(2)}'`)).rejects.toThrow();
  });
});

describe("five referrals complete the challenge", () => {
  it("is incomplete at 4 and complete at 5 (server-calculated)", async () => {
    for (let i = 3; i <= 6; i++) {
      const u = uid(i);
      await rpc("attribute_referral", `'ABCDEFGH23', '${u}'`);
      await db.exec(`insert into public.referral_codes (owner_id, code) values ('${u}', 'MMMMMMMM${i < 10 ? "2" + i : "3" + (i - 10)}')`);
      await db.exec(`update public.referrals set created_at = now() - interval '1 minute' where referred_user_id='${u}'`);
      const res = await rpc("verify_referral", `'${u}', true`);
      expect(res).toEqual({ result: "verified" });
      const status = await rpc("complete_challenge_if_eligible", `'${uid(1)}'`);
      expect(status.completed).toBe(i === 6);
      expect(status.verified).toBe(i - 1);
    }
    const p = await rpc("get_challenge_progress", `'${uid(1)}'`);
    expect(p.slots).toHaveLength(5);
    expect((p.slots as { status: string }[]).every((s) => s.status === "verified")).toBe(true);
    // unrelated user is not complete
    expect((await rpc("complete_challenge_if_eligible", `'${uid(7)}'`)).completed).toBe(false);
  });
});

describe("RLS & privileges (as authenticated client)", () => {
  const denied = (sql: string) => expect(db.exec(sql)).rejects.toThrow(/permission denied|row-level security/);

  it("client cannot read, write or fake referrals / events / rate limits", async () => {
    await as("authenticated", uid(1));
    await denied("select * from public.referrals");
    await denied(`insert into public.referrals (referral_code_id, referred_user_id, status, verified_at) select id, '${uid(8)}', 'verified', now() from public.referral_codes limit 1`);
    await denied("update public.referrals set status = 'verified'");
    await denied("select * from public.referral_events");
    await denied("insert into public.referral_events (event_type) values ('verified')");
    await denied("select * from public.rate_limits");
    await asAdmin();
  });
  it("client cannot create or edit codes, and sees only its own", async () => {
    await as("authenticated", uid(8));
    await denied(`insert into public.referral_codes (owner_id, code) values ('${uid(8)}', 'PPPPPPPP22')`);
    await denied("update public.referral_codes set active = false");
    expect((await db.query("select * from public.referral_codes")).rows).toHaveLength(0);
    await as("authenticated", uid(1));
    expect((await db.query("select * from public.referral_codes")).rows).toHaveLength(1);
    await asAdmin();
  });
  it("client cannot mark a challenge completed", async () => {
    await as("authenticated", uid(8));
    await denied(`insert into public.challenge_progress (owner_id, completed_at) values ('${uid(8)}', now())`);
    await denied("update public.challenge_progress set completed_at = now()");
    await asAdmin();
  });
  it("client can read own challenge row only", async () => {
    await as("authenticated", uid(1));
    expect((await db.query("select * from public.challenge_progress")).rows).toHaveLength(1);
    await as("authenticated", uid(8));
    expect((await db.query("select * from public.challenge_progress")).rows).toHaveLength(0);
    await asAdmin();
  });
  it("profiles: own row only, display_name only", async () => {
    await as("authenticated", uid(8));
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(1);
    await db.exec("update public.profiles set display_name = 'Me'");
    await denied(`update public.profiles set id = '${uid(99)}'`);
    await denied("update public.profiles set created_at = now()");
    await asAdmin();
  });
  it("anon has no table access; trusted functions are service_role only", async () => {
    await as("anon");
    await denied("select * from public.profiles");
    await denied("select * from public.referral_codes");
    await as("authenticated", uid(8));
    await denied(`select public.verify_referral('${uid(8)}', true)`);
    await denied(`select public.attribute_referral('ABCDEFGH23', '${uid(8)}')`);
    await denied(`select public.complete_challenge_if_eligible('${uid(8)}')`);
    await as("service_role");
    await db.exec(`select public.get_challenge_progress('${uid(8)}')`);
    await asAdmin();
  });
  it("rate limiter blocks after the max", async () => {
    const hits: unknown[] = [];
    for (let i = 0; i < 4; i++) hits.push(await rpc("check_rate_limit", "'k', 3, 60"));
    expect(hits).toEqual([true, true, true, false]);
  });
});
