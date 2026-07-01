-- Username chosen at sign-up. Passed in auth metadata (options.data.username)
-- and copied into the profile row by the handle_new_user trigger below.
alter table public.profiles
  add column if not exists username text;

-- Recreate the new-user trigger function to also capture the username from the
-- signup metadata (raw_user_meta_data). Existing behavior (auto-create profile)
-- is unchanged for users who don't supply one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;
