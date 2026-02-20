drop index if exists public.supplement_intake_user_date_supplement_key;

alter table public.supplement_intake
  drop column if exists user_id;

alter table public.supplement_intake
  drop constraint if exists supplement_intake_date_supplement_key;

alter table public.supplement_intake
  add constraint supplement_intake_date_supplement_key unique (date, supplement);
