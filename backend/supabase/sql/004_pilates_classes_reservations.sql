-- 필라테스: classes / reservations + profiles.remaining_credits
-- Supabase SQL Editor에서 실행하세요.
-- (이미 001_profiles_schema_and_rls.sql 등을 적용했다는 전제)

-- 1) profiles: 남은 수강권
alter table public.profiles
add column if not exists remaining_credits integer not null default 0;

alter table public.profiles
drop constraint if exists profiles_remaining_credits_non_negative;

alter table public.profiles
add constraint profiles_remaining_credits_non_negative
check (remaining_credits >= 0);

-- 2) classes: 수업
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructor_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  enrolled_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint classes_capacity_positive check (capacity > 0),
  constraint classes_enrolled_non_negative check (enrolled_count >= 0),
  constraint classes_time_order check (ends_at > starts_at),
  constraint classes_enrolled_lte_capacity check (enrolled_count <= capacity)
);

create index if not exists classes_starts_at_idx on public.classes (starts_at);

-- 3) reservations: 예약
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint reservations_status_check check (
    status in ('pending', 'confirmed', 'cancelled')
  ),
  -- 동일 수업에 동일 유저 중복 예약 방지(필요 없으면 이 unique 제거)
  constraint reservations_user_class_unique unique (user_id, class_id)
);

create index if not exists reservations_user_id_idx on public.reservations (user_id);
create index if not exists reservations_class_id_idx on public.reservations (class_id);
create index if not exists reservations_status_idx on public.reservations (status);

-- RLS는 프로젝트 정책에 맞게 별도 정의하세요.
-- 예: classes는 authenticated 전원 조회, reservations는 본인 row만 등.
