-- Wardrobe Stylist — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`). Every table is
-- RLS-scoped so a user can only touch their own rows.

-- ============================== profiles ==============================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'plus', 'pro')),
  stripe_customer_id text,
  preferred_styles jsonb not null default '[]'
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
-- inserts happen via the auth trigger below; tier changes via the Stripe
-- webhook (service role bypasses RLS). No user-facing insert/delete policy.

-- Auto-create a profile row for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================== garments ==============================
create table public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  category text not null,
  subtype text not null default '',
  primary_color text not null default '',
  secondary_colors jsonb not null default '[]',
  pattern text not null default 'solid',
  material_guess text not null default 'unknown',
  formality text not null default 'casual',
  season jsonb not null default '[]',
  fit_silhouette text not null default 'unknown',
  neutral boolean not null default false,
  confidence text not null default 'medium',
  -- normalized style-library tags used by the client-side scorer
  tags jsonb not null default '[]',
  -- true when the user corrected model tags (valuable training data)
  user_corrected boolean not null default false,
  created_at timestamptz not null default now()
);

create index garments_user_id_idx on public.garments (user_id, created_at desc);

alter table public.garments enable row level security;

create policy "garments_select_own" on public.garments
  for select using (user_id = auth.uid());
create policy "garments_insert_own" on public.garments
  for insert with check (user_id = auth.uid());
create policy "garments_update_own" on public.garments
  for update using (user_id = auth.uid());
create policy "garments_delete_own" on public.garments
  for delete using (user_id = auth.uid());

-- ============================ saved_outfits ===========================
create table public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_style text not null,
  garment_ids jsonb not null default '[]',
  score numeric not null default 0,
  why text,
  created_at timestamptz not null default now()
);

create index saved_outfits_user_id_idx on public.saved_outfits (user_id, created_at desc);

alter table public.saved_outfits enable row level security;

create policy "saved_outfits_select_own" on public.saved_outfits
  for select using (user_id = auth.uid());
create policy "saved_outfits_insert_own" on public.saved_outfits
  for insert with check (user_id = auth.uid());
create policy "saved_outfits_update_own" on public.saved_outfits
  for update using (user_id = auth.uid());
create policy "saved_outfits_delete_own" on public.saved_outfits
  for delete using (user_id = auth.uid());

-- ========================== generation_events =========================
-- One row per AI-style generation; the free-tier daily limit counts these.
create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index generation_events_user_id_idx on public.generation_events (user_id, created_at desc);

alter table public.generation_events enable row level security;

create policy "generation_events_select_own" on public.generation_events
  for select using (user_id = auth.uid());
create policy "generation_events_insert_own" on public.generation_events
  for insert with check (user_id = auth.uid());

-- ============================ storage bucket ==========================
-- Garment images live under garments/<user_id>/<filename>
insert into storage.buckets (id, name, public)
values ('garments', 'garments', false)
on conflict (id) do nothing;

create policy "garments_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "garments_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "garments_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text
  );
