-- Optional per-challenge custom bonus split (project-brief §15/§22 Feature 5).
-- The setter may override the default 30/20/10 placement points when creating a
-- challenge; the default itself lives in code (services/challenges.ts). Stored
-- as a JSON array of placement points, e.g. [30, 20, 10]. Null → use the
-- default. Additive and non-destructive: no rows are touched, safe to re-run.
alter table challenge add column if not exists bonus_split jsonb;
