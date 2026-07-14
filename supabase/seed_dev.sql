-- LOCAL DEVELOPMENT ONLY — demo members for testing endpoints without Supabase.
--
-- Do NOT run this against the real Supabase database: member.id there is a FK to
-- auth.users, and these fixed UUIDs have no matching auth user. On the real
-- instance, members are created through Supabase Auth and the first admin is set
-- manually (project-brief §25). Run this only after seed.sql (it needs the open
-- round) against a plain Postgres dev/CI database.

insert into member (id, name, email, gender, coefficient, division, role, status) values
  ('00000000-0000-0000-0000-000000000001', 'Bára Nováková', 'bara@pes.dev', 'f', 1.25, 'A', 'member', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Ondra Dvořák', 'ondra@pes.dev', 'm', 1.0, 'A', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Eva Pokorná', 'eva@pes.dev', 'f', 1.25, 'B', 'member', 'active')
on conflict (id) do nothing;

-- Record each demo member's division in the current open round.
insert into member_round_division (member_id, round_id, division)
select m.id, r.id, m.division
from member m
cross join round r
where r.name = 'Round 13 — Summer 2026'
  and m.email in ('bara@pes.dev', 'ondra@pes.dev', 'eva@pes.dev')
on conflict (member_id, round_id) do nothing;
