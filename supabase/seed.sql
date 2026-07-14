-- PES reference data every feature depends on.
--   * the 35-row activity rate table (project-brief §14)
--   * one open round and its weeks
-- Idempotent: safe to run more than once (activities upsert-skip; the round and
-- its weeks are only created if absent). Does NOT create any member or admin —
-- the first admin is set manually in Supabase (project-brief §25). Demo members
-- for local testing live in the separate seed_dev.sql.
--
-- Modelling notes:
--   * Strength/rep activities carry the block size in `unit` (e.g. '10 reps')
--     with points_per_unit = 1, so quantity is the number of blocks — this
--     avoids fractional per-rep rates and matches the frontend rate table.
--   * Tiered activities (unit 'pts') have points_per_unit 0 and a tier_options
--     array; the logged quantity IS the chosen preset point value.

insert into activity (
  id, name_cs, name_en, unit, points_per_unit,
  has_elevation_bonus, elevation_bonus_per_50m, elevation_bonus_per_50m_stroller,
  has_stroller_option, stroller_base_rate_override,
  is_tiered, tier_options, notes, active
) values
  ('run', 'běh', 'Running', 'km', 3, true, 1.5, 2.5, true, null, false, null, null, true),
  ('hike', 'túra', 'Hike', 'km', 1.5, true, 1, 2, true, 2, false, null, 'Base rate 2 b/km with a child carrier (base rate changes, not just elevation).', true),
  ('swim', 'plavání', 'Swimming', 'km', 15, false, null, null, false, null, false, null, null, true),
  ('paddleboard', 'paddleboard', 'Paddleboarding', 'km', 4.5, false, null, null, false, null, false, null, null, true),
  ('kayak', 'kayak, canoe', 'Kayak / canoe', 'km', 2.5, false, null, null, false, null, false, null, 'Calm water 2.5 b/km; wild water 1.5 b/km — confirm handling (brief §26).', true),
  ('skates', 'kolečkové brusle, koloběžka', 'Rollerblades / scooter', 'km', 1.25, true, 1.5, 2.5, true, null, false, null, null, true),
  ('bike-road', 'kolo silnice', 'Road cycling', 'km', 0.7, true, 1, null, false, null, false, null, null, true),
  ('bike-gravel', 'kolo gravel/cyklokros/trek', 'Gravel / cyclocross / trekking bike', 'km', 0.75, true, 1, null, false, null, false, null, null, true),
  ('bike-mtb', 'kolo MTB', 'Mountain bike', 'km', 1, true, 1, null, false, null, false, null, null, true),
  ('bike-stroller', 'kolo s kočárem', 'Cycling with stroller', 'km', 1.5, true, 2, null, false, null, false, null, 'Dedicated with-stroller cycling row (brief §14).', true),
  ('xcski', 'běžky', 'Cross-country skiing', 'km', 1.5, true, 1.5, null, true, 3, false, null, 'AMBIGUOUS: source sheet lists 3 b/km with stroller — may be a typo. Confirm the real rate with the group before trusting (brief §26).', true),
  ('skitour', 'skialpy', 'Ski touring', 'km', 2, true, 1.5, null, false, null, false, null, null, true),
  ('downhill', 'lyže/snowboard', 'Downhill ski / snowboard', 'km', 0.5, false, null, null, false, null, false, null, 'Includes lift-assisted km; no elevation bonus.', true),
  ('tabata', 'tabata', 'Tabata', 'session', 4, false, null, null, false, null, false, null, 'Reference video linked in-app.', true),
  ('plank-sally', 'plank Sally', 'Plank Sally', 'rep', 8, false, null, null, false, null, false, null, 'Reference video linked in-app.', true),
  ('plank', 'plank classic', 'Classic plank', 'min', 2, false, null, null, false, null, false, null, null, true),
  ('pushups', 'kliky', 'Push-ups', '10 reps', 1, false, null, null, false, null, false, null, 'Knee push-ups allowed.', true),
  ('squats', 'dřepy', 'Squats', '10 reps', 1, false, null, null, false, null, false, null, null, true),
  ('situps', 'sedy/lehy', 'Sit-ups', '15 reps', 1, false, null, null, false, null, false, null, 'Other ab exercises allowed by group agreement.', true),
  ('mountain-climber', 'mountain climber', 'Mountain climbers', '15 reps', 1, false, null, null, false, null, false, null, '1 rep = 1 leg movement.', true),
  ('lunges', 'výpady', 'Lunges', '10 reps', 1, false, null, null, false, null, false, null, '5+5 per leg.', true),
  ('hip-raises', 'zvedání pánve', 'Hip raises', '25 reps', 1, false, null, null, false, null, false, null, null, true),
  ('burpees', 'angličáky bez kliku', 'Burpees (no push-up)', '10 reps', 1, false, null, null, false, null, false, null, null, true),
  ('burpees-pushup', 'angličáky s klikem', 'Burpees (with push-up)', '7 reps', 1, false, null, null, false, null, false, null, null, true),
  ('vups', 'sklapovačky', 'V-ups', '10 reps', 1, false, null, null, false, null, false, null, null, true),
  ('pullups', 'shyby', 'Pull-ups', '4 reps', 1, false, null, null, false, null, false, null, null, true),
  ('dips', 'dipy bradla', 'Dips', '7 reps', 1, false, null, null, false, null, false, null, null, true),
  ('hanging-leg-raises', 'skrčky nohou bradla', 'Hanging leg raises', '10 reps', 1, false, null, null, false, null, false, null, null, true),
  ('sun-salutation', 'pozdrav Slunci', 'Sun salutation', 'rep', 2, false, null, null, false, null, false, null, null, true),
  ('exercise', 'cvičení různé', 'Various exercise', 'pts', 0, false, null, null, false, null, true, '[5, 10, 15, 30]'::jsonb, 'Preset point value — classes, gym, yoga, fitbox; tier judged by effort.', true),
  ('jumprope', 'švihadlo', 'Jump rope', '60 s', 1, false, null, null, false, null, false, null, null, true),
  ('sports', 'sporty různé', 'Various other sports', 'pts', 0, false, null, null, false, null, true, '[5, 10, 15, 30]'::jsonb, 'Preset point value — tier judged by effort.', true),
  ('strava', 'body STRAVA', 'Strava segment points', 'pts', 0, false, null, null, false, null, true, '[5, 10, 20, 30]'::jsonb, 'Preset point value — based on segment placement; max 30 b/week; deducted if later beaten.', true),
  ('race', 'body závod', 'Race participation', 'race', 30, false, null, null, false, null, false, null, 'Flat 30 b regardless of placement.', true),
  ('ondra', 'body výzva (jen pro Ondru)', 'Legacy challenge bonus (Ondra only)', 'pts', 0, false, null, null, false, null, true, '[10, 20, 30]'::jsonb, 'Kept as its own row per group decision, though Challenges now covers this for everyone else (brief §14).', true)
on conflict (id) do nothing;

-- One open round (a half-year competition) ------------------------------------
insert into round (name, start_date, end_date, status)
select 'Round 13 — Summer 2026', date '2026-07-06', date '2026-12-27', 'open'
where not exists (select 1 from round where name = 'Round 13 — Summer 2026');

-- Its weeks: Monday-start, Sunday-end, one row per 7-day step across the round.
insert into week (round_id, week_number, start_date, end_date)
select
  r.id,
  gs.week_number,
  gs.wk::date,
  (gs.wk + interval '6 days')::date
from round r
cross join lateral (
  select
    row_number() over (order by wk)::int as week_number,
    wk
  from generate_series(r.start_date, r.end_date, interval '7 days') as wk
) gs
where r.name = 'Round 13 — Summer 2026'
  and not exists (select 1 from week w where w.round_id = r.id);
