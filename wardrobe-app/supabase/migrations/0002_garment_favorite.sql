-- Individual-piece favorites: a heart toggle on each garment that biases outfit
-- recommendations (weather → favorites → score). Defaults false so existing rows
-- are unaffected. RLS is already scoped per-user on the garments table.
alter table public.garments
  add column if not exists favorite boolean not null default false;
