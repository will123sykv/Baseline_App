-- Baseline: initial schema.
-- Every table holds one user's rows only. Row Level Security makes the database
-- itself refuse to show or change anyone else's rows, whatever the app does.
-- Keep in step with packages/core/src/daily.ts and docs/DESIGN.md.

-- ---------------------------------------------------------------------------
-- Profile and targets
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  sex            text check (sex in ('male', 'female')),
  birth_year     int check (birth_year between 1900 and 2100),
  height_cm      numeric(5, 1) check (height_cm between 50 and 260),
  units          text not null default 'metric' check (units in ('metric', 'imperial')),
  -- e.g. {"kcal": 2500, "proteinPerKg": 1.6, "steps": 8000, "sleepMin": 480}
  targets        jsonb not null default '{}'::jsonb,
  ai_enabled     boolean not null default false,
  ai_monthly_cap_gbp numeric(6, 2) not null default 2.00,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- One row per day, computed on the phone. Raw heart-rate samples never arrive.
-- ---------------------------------------------------------------------------
create table public.daily_metrics (
  user_id          uuid not null references auth.users (id) on delete cascade,
  date             date not null,
  hrv_ms           numeric(6, 1),
  resting_hr       numeric(5, 1),
  sleep_min        int,
  sleep_score      int check (sleep_score between 0 and 100),
  steps            int,
  active_kcal      int,
  resting_kcal     int,
  strain           numeric(7, 1),
  recovery         int check (recovery between 0 and 100),
  weight_kg        numeric(5, 2),
  weight_trend_kg  numeric(5, 2),
  intake_kcal      int,
  protein_g        numeric(6, 1),
  carbs_g          numeric(6, 1),
  fat_g            numeric(6, 1),
  mood             smallint check (mood between 1 and 5),
  energy           smallint check (energy between 1 and 5),
  soreness         smallint check (soreness between 1 and 5),
  updated_at       timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Food
-- ---------------------------------------------------------------------------
create table public.food_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  eaten_at       timestamptz not null,
  meal           text check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  source         text not null check (source in ('photo', 'barcode', 'search', 'quick', 'saved')),
  name           text not null,
  grams          numeric(7, 1),
  kcal           numeric(7, 1) not null,
  protein_g      numeric(6, 1) not null default 0,
  carbs_g        numeric(6, 1) not null default 0,
  fat_g          numeric(6, 1) not null default 0,
  photo_path     text,
  ai_confidence  text check (ai_confidence in ('low', 'medium', 'high')),
  created_at     timestamptz not null default now()
);
create index food_entries_user_time on public.food_entries (user_id, eaten_at desc);

create table public.saved_foods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  barcode         text,
  kcal_100g       numeric(7, 1) not null,
  protein_100g    numeric(6, 1) not null default 0,
  carbs_100g      numeric(6, 1) not null default 0,
  fat_100g        numeric(6, 1) not null default 0,
  usual_grams     numeric(7, 1),
  created_at      timestamptz not null default now()
);
create index saved_foods_user on public.saved_foods (user_id);

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  -- null = shared starter list, visible to everyone
  user_id       uuid references auth.users (id) on delete cascade,
  name          text not null,
  muscle_group  text not null
);

create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  started_at    timestamptz not null,
  minutes       int,
  type          text not null default 'strength',
  effort        smallint check (effort between 1 and 10),
  notes         text,
  created_at    timestamptz not null default now()
);
create index workouts_user_time on public.workouts (user_id, started_at desc);

create table public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id),
  set_number   smallint not null,
  reps         smallint not null check (reps > 0),
  weight_kg    numeric(6, 2) not null default 0,
  effort       smallint check (effort between 1 and 10)
);
create index workout_sets_workout on public.workout_sets (workout_id);

-- ---------------------------------------------------------------------------
-- AI usage and chat (AI is off until a key is set and ai_enabled = true)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  user_id        uuid not null references auth.users (id) on delete cascade,
  month          date not null, -- first day of the month
  requests       int not null default 0,
  input_tokens   bigint not null default 0,
  output_tokens  bigint not null default 0,
  est_cost_gbp   numeric(8, 4) not null default 0,
  primary key (user_id, month)
);

create table public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index ai_messages_user_time on public.ai_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: a row is visible only to the user it belongs to.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.food_entries  enable row level security;
alter table public.saved_foods   enable row level security;
alter table public.exercises     enable row level security;
alter table public.workouts      enable row level security;
alter table public.workout_sets  enable row level security;
alter table public.ai_usage      enable row level security;
alter table public.ai_messages   enable row level security;

create policy "own rows" on public.profiles      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.daily_metrics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.food_entries  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.saved_foods   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.workouts      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.workout_sets  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.ai_messages   for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Exercises: everyone can read the shared list; you can only add/edit your own.
create policy "read shared or own" on public.exercises for select using (user_id is null or user_id = auth.uid());
create policy "write own" on public.exercises for insert with check (user_id = auth.uid());
create policy "update own" on public.exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own" on public.exercises for delete using (user_id = auth.uid());

-- AI usage: readable by you, but only Edge Functions (service role) can write it,
-- so the app can't reset its own spending counter.
create policy "read own" on public.ai_usage for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch      before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger daily_metrics_touch before update on public.daily_metrics for each row execute function public.touch_updated_at();

-- A profile row appears automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for meal photos; each user's files live under their own folder.
insert into storage.buckets (id, name, public) values ('food-photos', 'food-photos', false)
  on conflict (id) do nothing;

create policy "own photos read" on storage.objects for select
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos write" on storage.objects for insert
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Shared starter exercises.
insert into public.exercises (user_id, name, muscle_group) values
  (null, 'Bench press', 'chest'),
  (null, 'Incline dumbbell press', 'chest'),
  (null, 'Overhead press', 'shoulders'),
  (null, 'Lateral raise', 'shoulders'),
  (null, 'Pull-up', 'back'),
  (null, 'Barbell row', 'back'),
  (null, 'Lat pulldown', 'back'),
  (null, 'Squat', 'legs'),
  (null, 'Romanian deadlift', 'legs'),
  (null, 'Leg press', 'legs'),
  (null, 'Deadlift', 'back'),
  (null, 'Bicep curl', 'arms'),
  (null, 'Tricep pushdown', 'arms'),
  (null, 'Plank', 'core');
