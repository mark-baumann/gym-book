alter table public.supplement_intake enable row level security;

drop policy if exists "Allow all access to supplement_intake" on public.supplement_intake;
create policy "Allow all access to supplement_intake"
  on public.supplement_intake
  for all
  using (true)
  with check (true);
