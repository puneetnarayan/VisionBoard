-- Total on-disk size (bytes) of this app's tables, so the site can show how much storage it uses.
create or replace function public.vision_board_usage()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(pg_total_relation_size('public.vision_board_views'), 0)
       + coalesce(pg_total_relation_size('public.vision_board_actions'), 0);
$$;

revoke all on function public.vision_board_usage() from public;
grant execute on function public.vision_board_usage() to anon, authenticated;
