-- Admin can create the *next* round before it starts (chunk 11,
-- POST /api/admin/rounds). Such a round is neither open nor finished, so allow
-- an 'upcoming' status alongside 'open'/'closed' (the frontend `RoundStatus`
-- already models these three). Opening/closing stays manual for MVP.
-- Additive: widens the CHECK; existing rows ('open'/'closed') are unaffected.
alter table round drop constraint if exists round_status_check;
alter table round
  add constraint round_status_check check (status in ('upcoming', 'open', 'closed'));
