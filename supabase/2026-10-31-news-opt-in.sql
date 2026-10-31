-- "Email me Starport news" consent, asked at signup and on the Grown-ups page.
alter table public.profiles add column if not exists news_opt_in boolean not null default false;
alter table public.profiles add column if not exists news_opt_in_at timestamptz;
