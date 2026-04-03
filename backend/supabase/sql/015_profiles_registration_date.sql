-- 센터 등록일(관리자 지정). 시스템 프로필 생성 시각(created_at)과 별도.
alter table public.profiles
  add column if not exists registration_date date;

comment on column public.profiles.registration_date is '센터 등록일(관리자 입력)';
