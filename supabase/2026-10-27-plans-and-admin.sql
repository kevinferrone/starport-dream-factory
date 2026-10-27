-- Run once in Supabase → SQL Editor → New query → Run.
-- Adds the Supernova and Galaxy plans, restored creations, subscription details and the activity log.

-- New plan names allowed everywhere a plan is stored
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check
  check (tier in ('free', 'plus', 'pro', 'max', 'unlimited'));
alter table public.profiles drop constraint if exists profiles_comp_tier_check;
alter table public.profiles add constraint profiles_comp_tier_check
  check (comp_tier in ('plus', 'pro', 'max', 'unlimited'));
alter table public.comp_invites drop constraint if exists comp_invites_comp_tier_check;
alter table public.comp_invites add constraint comp_invites_comp_tier_check
  check (comp_tier in ('plus', 'pro', 'max', 'unlimited'));
alter table public.site_settings drop constraint if exists site_settings_free_for_all_tier_check;
alter table public.site_settings add constraint site_settings_free_for_all_tier_check
  check (free_for_all_tier in ('plus', 'pro', 'max', 'unlimited'));

-- Subscription details for the admin pages
alter table public.profiles add column if not exists cancel_at_period_end boolean not null default false;
alter table public.profiles add column if not exists current_period_end timestamptz;

-- Creations an admin gave back don't count toward the plan
alter table public.creations add column if not exists refunded boolean not null default false;
create index if not exists creations_created on public.creations (created_at desc);

-- Activity log (cards made, billing changes, admin actions). Only the server can read or write it.
create table if not exists public.activity (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  actor_id uuid,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists activity_created on public.activity (created_at desc);
create index if not exists activity_user on public.activity (user_id, created_at desc);
alter table public.activity enable row level security;
