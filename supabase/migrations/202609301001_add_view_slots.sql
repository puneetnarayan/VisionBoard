-- Allow up to 3 daily views (morning / afternoon / evening) per visitor.
alter table public.vision_board_views
  add column if not exists slot text not null default 'morning';

alter table public.vision_board_views
  drop constraint if exists vision_board_views_slot_check;
alter table public.vision_board_views
  add constraint vision_board_views_slot_check
  check (slot in ('morning', 'afternoon', 'evening'));

-- One view per slot per day instead of one view per day.
drop index if exists public.vision_board_views_visitor_date_unique;
create unique index if not exists vision_board_views_visitor_date_slot_unique
  on public.vision_board_views (visitor_id, view_date, slot);
