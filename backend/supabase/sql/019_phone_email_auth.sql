-- 휴대폰 기반 로그인·가입: 전화번호 조회 RPC, 중복 확인, 전화번호 유니크 인덱스
-- 이메일 OTP 가입 전 `is_signup_email_available` 로 auth.users 중복 차단

-- 1) 전화번호(숫자만 동일)로 로그인 시 auth 연락처 조회
create or replace function public.get_login_contact_by_phone(p_phone_e164 text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'phone', nullif(trim(coalesce(nullif(trim(u.phone), ''), nullif(trim(p.phone), ''))), ''),
    'email', nullif(trim(u.email), '')
  )
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone_e164, ''), '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.get_login_contact_by_phone(text) from public;
grant execute on function public.get_login_contact_by_phone(text) to anon, authenticated;

-- 2) 가입 시 전화번호 중복 여부 (true = 사용 가능)
create or replace function public.is_phone_available(p_phone_e164 text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone_e164, ''), '\D', '', 'g')
      and coalesce(trim(p.phone), '') <> ''
  );
$$;

revoke all on function public.is_phone_available(text) from public;
grant execute on function public.is_phone_available(text) to anon, authenticated;

-- 3) 가입 시 이메일이 auth.users 에 없는지 (true = 사용 가능)
create or replace function public.is_signup_email_available(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
    from auth.users
    where lower(trim(email)) = lower(trim(p_email))
      and coalesce(trim(email), '') <> ''
  );
$$;

revoke all on function public.is_signup_email_available(text) from public;
grant execute on function public.is_signup_email_available(text) to anon, authenticated;

-- 4) 동일 휴대폰 번호(숫자 기준) 중복 방지 — 기존 중복 데이터가 있으면 먼저 정리 후 실행
drop index if exists profiles_phone_digits_uidx;
create unique index profiles_phone_digits_uidx
  on public.profiles (regexp_replace(coalesce(phone, ''), '\D', '', 'g'))
  where phone is not null and trim(phone) <> '';
