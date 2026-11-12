-- Characters builder (Nov 12, 2026): allow hero cards in creations.
-- Run once in the Supabase SQL editor before anyone builds a character.
alter table public.creations drop constraint if exists creations_kind_check;
alter table public.creations
  add constraint creations_kind_check check (kind in ('character', 'creature', 'equipment', 'pet'));
