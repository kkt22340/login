-- 필라테스 센터 관리자용: 회원권 마감일, 관리자 메모(특이 사항)
-- Supabase SQL Editor에서 실행하세요.

alter table public.profiles
  add column if not exists membership_expires_at date,
  add column if not exists admin_notes text;

comment on column public.profiles.membership_expires_at is '회원권/패키지 마감일(센터 관리용)';
comment on column public.profiles.admin_notes is '센터 관리자 특이 사항 메모';
