-- Quick-add log entries (project-brief §22) are a raw point total for edge
-- cases that do not map to any rate-table activity, so `log_entry.activity_id`
-- must be nullable. Detailed and (later) LLM entries still reference a real
-- activity via the existing FK. Additive and non-destructive: this only relaxes
-- the NOT NULL constraint; no rows are touched and it is safe to re-run.
alter table log_entry alter column activity_id drop not null;
