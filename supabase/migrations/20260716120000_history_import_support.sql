-- Support importing the group's spreadsheet history (rounds R1–R12).
--
-- 1) Data-only members: the historical roster is imported as `member` rows that
--    are NOT (yet) linked to a Supabase Auth user. The original schema tied
--    member.id to auth.users(id); drop that FK so historical members can exist
--    with a random UUID and no login. Live members still use
--    member.id = auth.users.id BY APP CONVENTION (see middleware/auth.ts) — it is
--    just no longer DB-enforced. A real account "claims" a historical member
--    later via an admin merge tool (reassigns their rows).
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'member_id_auth_users_fkey' and table_name = 'member'
  ) then
    alter table member drop constraint member_id_auth_users_fkey;
  end if;
end $$;

-- Flags a row that came from the historical import and has no login yet
-- (so the claim/merge tool and "active roster" filters can tell them apart).
alter table member add column if not exists is_historical boolean not null default false;

-- 2) "Příspěvky do banku" — penalty/bank points per member per round (a separate
--    mechanic from activity points). One row per (member, round).
create table if not exists member_round_bank (
  member_id uuid not null references member (id) on delete cascade,
  round_id  uuid not null references round (id) on delete cascade,
  points    numeric(10, 2) not null default 0,
  primary key (member_id, round_id)
);
