alter table public.supplement_intake
  add column if not exists user_id uuid;

alter table public.supplement_intake
  drop constraint if exists supplement_intake_date_supplement_key;

create unique index if not exists supplement_intake_user_date_supplement_key
  on public.supplement_intake (user_id, date, supplement);
