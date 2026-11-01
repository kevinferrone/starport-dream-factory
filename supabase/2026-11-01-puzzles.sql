-- Puzzle Lab: one row per solved puzzle, plus bonus creations earned from ranks.
create table if not exists public.puzzle_solves (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('wordsearch', 'sudoku', 'codebreaker')),
  grade int not null check (grade between 1 and 7),
  hints int not null default 0,
  points int not null,
  created_at timestamptz not null default now()
);
create index if not exists puzzle_solves_user on public.puzzle_solves (user_id, created_at desc);
alter table public.puzzle_solves enable row level security;
drop policy if exists "own solves" on public.puzzle_solves;
create policy "own solves" on public.puzzle_solves for select using (auth.uid() = user_id);

-- Ranks reached so far (each one above Cadet = one bonus creation, 7 at most).
alter table public.profiles add column if not exists bonus_creations int not null default 0;
-- Marks a card that used a bonus creation, so it doesn't count against the monthly plan.
alter table public.creations add column if not exists bonus boolean not null default false;
