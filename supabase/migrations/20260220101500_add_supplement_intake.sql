create table if not exists public.supplement_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null default current_date,
  supplement text not null check (supplement in ('creatine', 'protein')),
  unique (date, supplement)
);
