-- GDPR consent handling.
--
-- Two parts:
--  1) Current per-account consent state on `member`, so the backend can gate
--     non-essential processing (e.g. the marketing / weekly-nudge email). Both
--     default FALSE — consent is never assumed (no pre-ticked boxes; GDPR art.7
--     requires an active opt-in, and silence/inactivity is not consent).
--  2) An immutable `consent_log` audit trail: one row per consent decision event
--     (grant OR withdrawal of a single category), recording who (if known), a
--     HASHED IP (data minimisation — the raw address is never stored), a precise
--     timestamp, the consent category, whether it was granted, and the
--     version + hash of the policy text the person agreed to (so we can prove
--     what was shown even after the wording changes).

alter table member
  add column if not exists analytics_consent boolean not null default false,
  add column if not exists marketing_consent boolean not null default false;

create table if not exists consent_log (
  id uuid primary key default gen_random_uuid(),
  -- The member who made the choice, or NULL for an anonymous (pre-login) visitor.
  -- ON DELETE SET NULL keeps the audit row even if the account is later erased.
  member_id uuid references member (id) on delete set null,
  -- SHA-256 of the client IP + a server-side salt. Never the raw IP
  -- (art.5(1)(c) data minimisation). NULL when the IP could not be determined.
  ip_hash text,
  -- The consent category this row concerns.
  consent_type text not null check (consent_type in ('essential', 'analytics', 'marketing')),
  -- Whether this category was granted (true) or refused / withdrawn (false).
  granted boolean not null,
  -- Version + hash of the exact consent/policy text shown at decision time.
  policy_version text not null,
  policy_hash text not null,
  -- Optional coarse context; kept small.
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists consent_log_member_id_idx on consent_log (member_id);
create index if not exists consent_log_created_at_idx on consent_log (created_at);
