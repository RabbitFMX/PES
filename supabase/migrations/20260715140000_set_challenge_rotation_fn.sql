-- Atomic replace of the challenge-setter rotation (chunk 11,
-- PUT /api/admin/rotation). The rotation is a full reordered list, so persisting
-- it clears and re-inserts every row. A plpgsql function runs in a single
-- transaction, so there is never a partial write (spec: no partial writes).
-- `order_position` is 0-based, matching the array order passed in.
create or replace function set_challenge_rotation(p_member_ids uuid[])
returns void
language plpgsql
as $$
begin
  delete from challenge_rotation;
  insert into challenge_rotation (member_id, order_position)
  select id, ord - 1
  from unnest(p_member_ids) with ordinality as t(id, ord);
end;
$$;
