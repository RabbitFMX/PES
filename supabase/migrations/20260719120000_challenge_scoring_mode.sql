-- Challenge scoring mode (Feature 3 update).
-- A challenge is scored one of two ways:
--   'competitive' — members submit a numeric value, top placements auto-earn the
--                   bonus_split points (30/20/10 default), ties split a placement.
--   'completion'  — the setter/admin awards completion points per member directly
--                   (no member submissions); useful for judgment-based challenges.
-- Either way the awarded challenge_submission.bonus_points now count into each
-- member's weekly + round totals (see services). Additive, non-destructive,
-- safe to re-run.
alter table challenge
  add column if not exists scoring_mode text not null default 'competitive'
    check (scoring_mode in ('competitive', 'completion'));
