-- Limit each request to the rows whose visitor_id matches the sync code the app sends
-- in the `x-visitor-id` request header. Replaces the earlier open (using true) policies.
-- Apply this AFTER the app version that sends the header is deployed.

-- vision_board_views
drop policy if exists "vision board views are publicly readable" on public.vision_board_views;
drop policy if exists "vision board views are publicly insertable" on public.vision_board_views;
drop policy if exists "vision board views readable by sync code" on public.vision_board_views;
drop policy if exists "vision board views insertable by sync code" on public.vision_board_views;

create policy "vision board views readable by sync code"
  on public.vision_board_views for select to anon, authenticated
  using (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));

create policy "vision board views insertable by sync code"
  on public.vision_board_views for insert to anon, authenticated
  with check (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));

-- vision_board_actions
drop policy if exists "vision board actions are publicly readable" on public.vision_board_actions;
drop policy if exists "vision board actions are publicly insertable" on public.vision_board_actions;
drop policy if exists "vision board actions are publicly updatable" on public.vision_board_actions;
drop policy if exists "vision board actions are publicly deletable" on public.vision_board_actions;
drop policy if exists "vision board actions readable by sync code" on public.vision_board_actions;
drop policy if exists "vision board actions insertable by sync code" on public.vision_board_actions;
drop policy if exists "vision board actions updatable by sync code" on public.vision_board_actions;
drop policy if exists "vision board actions deletable by sync code" on public.vision_board_actions;

create policy "vision board actions readable by sync code"
  on public.vision_board_actions for select to anon, authenticated
  using (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));

create policy "vision board actions insertable by sync code"
  on public.vision_board_actions for insert to anon, authenticated
  with check (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));

create policy "vision board actions updatable by sync code"
  on public.vision_board_actions for update to anon, authenticated
  using (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'))
  with check (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));

create policy "vision board actions deletable by sync code"
  on public.vision_board_actions for delete to anon, authenticated
  using (visitor_id <> '' and visitor_id = (nullif(current_setting('request.headers', true), '')::json ->> 'x-visitor-id'));
