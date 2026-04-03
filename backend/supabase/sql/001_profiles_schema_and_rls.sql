-- profiles 기본 스키마 + RLS 정책(관리자/일반 사용자 분리)
-- Supabase SQL Editor에서 실행하세요.

-- 0) profiles 테이블이 없다면 생성 (이미 있으면 이 블록은 무시/수정)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  is_admin boolean not null default false
);

-- 1) RLS 켜기
alter table public.profiles enable row level security;

-- 2) 관리자 여부 확인 함수 (Security Definer)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.is_admin = true
  );
$$;

-- 3) 정책 정리
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_delete_admin_only" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;

-- 4) 정책 생성
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_delete_admin_only"
on public.profiles
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- 5) 컬럼 권한으로 is_admin 보호 (중요)
revoke update (is_admin) on table public.profiles from authenticated;

