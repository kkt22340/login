-- 회원 마이페이지: 주소
alter table public.profiles
  add column if not exists address text;

comment on column public.profiles.address is '회원 주소(본인 수정)';
