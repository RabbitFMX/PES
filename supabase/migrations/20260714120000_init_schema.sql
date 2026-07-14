-- PES initial schema — implements the project-brief §13 data model.
-- snake_case Postgres columns; camelCase in the API/frontend maps 1:1 to these.
--
-- Identity note: member.id IS the Supabase auth.users UUID, so an authenticated
-- request maps straight to a member row. Supabase Auth owns the email+password
-- credentials (auth.users), which is why there is no password_hash column here
-- (project-brief §11/§25). The FK to auth.users is added at the bottom only when
-- that table exists, so this migration also applies cleanly to a plain Postgres
-- database (used for local/CI verification).

create extension if not exists pgcrypto; -- gen_random_uuid()

-- Members ---------------------------------------------------------------------
create table member (
  id uuid primary key,
  name text not null,
  email text not null unique,
  gender text,
  coefficient numeric(4, 2) not null default 1.0 check (coefficient in (1.0, 1.25)),
  division text not null default 'B' check (division in ('A', 'B')),
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'left')),
  joined_date date not null default current_date,
  avatar_url text,
  language_pref text not null default 'cs' check (language_pref in ('cs', 'en')),
  theme_pref text not null default 'light' check (theme_pref in ('light', 'dark')),
  injury_exempt_until date
);

-- Activity rate table (project-brief §14) -------------------------------------
create table activity (
  id text primary key,
  name_cs text not null,
  name_en text not null,
  unit text not null,
  points_per_unit numeric(8, 3) not null default 0,
  has_elevation_bonus boolean not null default false,
  elevation_bonus_per_50m numeric(6, 3),
  elevation_bonus_per_50m_stroller numeric(6, 3),
  has_stroller_option boolean not null default false,
  stroller_base_rate_override numeric(8, 3),
  is_tiered boolean not null default false,
  tier_options jsonb,
  notes text,
  active boolean not null default true
);

-- Rounds (half-year competitions) and their weeks -----------------------------
create table round (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  check (end_date >= start_date)
);

create table week (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references round (id) on delete cascade,
  week_number integer not null,
  start_date date not null,
  end_date date not null,
  unique (round_id, week_number)
);
create index week_round_id_idx on week (round_id);

-- Log entries -----------------------------------------------------------------
-- raw_points is before the fenčí koeficient, final_points after — kept separate
-- so the app can show "24 ×1.25 = 30" and recompute if a coefficient changes.
create table log_entry (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references member (id) on delete cascade,
  week_id uuid not null references week (id) on delete restrict,
  activity_id text not null references activity (id) on delete restrict,
  activity_date date not null,
  quantity numeric(10, 3) not null,
  unit text not null,
  elevation_m numeric(8, 2),
  with_stroller boolean not null default false,
  raw_points numeric(10, 2) not null,
  final_points numeric(10, 2) not null,
  source text not null check (source in ('manual', 'quick-add', 'llm')),
  note text,
  created_at timestamptz not null default now()
);
create index log_entry_member_id_idx on log_entry (member_id);
create index log_entry_week_id_idx on log_entry (week_id);
create index log_entry_activity_id_idx on log_entry (activity_id);

-- Challenges ------------------------------------------------------------------
create table challenge (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references week (id) on delete cascade,
  setter_member_id uuid references member (id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index challenge_week_id_idx on challenge (week_id);

create table challenge_submission (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenge (id) on delete cascade,
  member_id uuid not null references member (id) on delete cascade,
  value numeric(12, 3),
  rank integer,
  bonus_points numeric(8, 2) not null default 0,
  submitted_at timestamptz not null default now(),
  unique (challenge_id, member_id)
);
create index challenge_submission_challenge_id_idx on challenge_submission (challenge_id);

-- Admin-defined order for who sets the next weekly challenge.
create table challenge_rotation (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references member (id) on delete cascade,
  order_position integer not null unique
);

-- Which division a member was in for a given (past) round, so "best round
-- finish" reflects their division at the time, not their current one.
create table member_round_division (
  member_id uuid not null references member (id) on delete cascade,
  round_id uuid not null references round (id) on delete cascade,
  division text not null check (division in ('A', 'B')),
  primary key (member_id, round_id)
);

-- Link member identity to Supabase Auth only when running against Supabase
-- (the auth schema exists there). Skipped on plain Postgres.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    alter table member
      add constraint member_id_auth_users_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;
