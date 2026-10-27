-- Starport Dream Factory database
-- Run this once in Supabase → SQL Editor → New query → Run.

-- ---------- Profiles (one per parent account) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  parent_confirmed boolean not null default false,
  -- paid plan from Stripe: free | plus | pro | max | unlimited (names and limits in lib/access.ts)
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro', 'max', 'unlimited')),
  -- free access given by Kevin; overrides the paid tier when set
  comp_tier text check (comp_tier in ('plus', 'pro', 'max', 'unlimited')),
  is_admin boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  -- grade level for card writing: 0 = kindergarten ... 7 = 7th grade and up
  reading_level int check (reading_level between 0 and 7),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists reading_level int check (reading_level between 0 and 7);

-- Emails given free access before they sign up
create table if not exists public.comp_invites (
  email text primary key,
  comp_tier text not null check (comp_tier in ('plus', 'pro', 'max', 'unlimited')),
  created_at timestamptz not null default now()
);

-- Site-wide switches (a single row)
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  free_for_all boolean not null default false,
  free_for_all_tier text not null default 'pro' check (free_for_all_tier in ('plus', 'pro', 'max', 'unlimited'))
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- ---------- Creations (every build counts toward the plan limit) ----------
create table if not exists public.creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('creature', 'equipment', 'pet')),
  choices jsonb not null,
  prompt_text text,
  card jsonb not null,
  image_url text,
  image_path text,
  status text not null default 'draft' check (status in ('draft', 'saved', 'deleted')),
  reroll_count int not null default 0,
  refunded boolean not null default false, -- given back by an admin: doesn't count toward the plan
  created_at timestamptz not null default now(),
  saved_at timestamptz
);
create index if not exists creations_user_created on public.creations (user_id, created_at desc);

-- ---------- Activity log (server only) ----------
create table if not exists public.activity (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  actor_id uuid,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists activity_created on public.activity (created_at desc);
alter table public.activity enable row level security;

-- ---------- New user → profile (and apply any comp invite) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invite_tier text;
begin
  select comp_tier into invite_tier from public.comp_invites where lower(email) = lower(new.email);
  insert into public.profiles (id, email, comp_tier)
  values (new.id, new.email, invite_tier)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row level security ----------
-- The browser can only READ its own rows. All writes go through the server
-- (which uses the service role key and checks limits first).
alter table public.profiles enable row level security;
alter table public.creations enable row level security;
alter table public.site_settings enable row level security;
alter table public.comp_invites enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "read own creations" on public.creations;
create policy "read own creations" on public.creations
  for select using (auth.uid() = user_id and status <> 'deleted');

drop policy if exists "read site settings" on public.site_settings;
create policy "read site settings" on public.site_settings
  for select using (true);
-- comp_invites: no policies → only the server can see it.

-- ---------- Picture storage ----------
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

-- ---------- Make yourself the admin ----------
-- After you log in to the site once, run this with your email:
-- update public.profiles set is_admin = true where email = 'you@example.com';
