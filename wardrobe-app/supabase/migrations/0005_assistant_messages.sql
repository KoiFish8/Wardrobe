-- Capsule Stylist usage log — one row per answered (or off-topic-refused) message,
-- used to enforce the per-user daily message quota in the style-assistant Edge
-- Function. RLS-scoped so users only see/insert their own rows.
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_user_id_idx
  on public.assistant_messages (user_id, created_at desc);

alter table public.assistant_messages enable row level security;

create policy "assistant_messages_select_own" on public.assistant_messages
  for select using (user_id = auth.uid());
create policy "assistant_messages_insert_own" on public.assistant_messages
  for insert with check (user_id = auth.uid());
