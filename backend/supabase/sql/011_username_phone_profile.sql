-- 회원가입 확장: 아이디(username), 생년월일, 전화번호 + 중복/로그인 조회 RPC
-- Supabase → Authentication → Providers → Phone 활성화 및 SMS(Twilio 등) 설정 필요

alter table public.profiles
  add column if not exists username text,
  add column if not exists birth_date date,
  add column if not exists phone text;

drop index if exists profiles_username_lower_uidx;
create unique index profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null and trim(username) <> '';

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(trim(username)) = lower(trim(p_username))
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.get_phone_by_username(p_username text)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_phone text;
begin
  select u.phone into v_phone
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where lower(trim(p.username)) = lower(trim(p_username))
  limit 1;

  return v_phone;
end;
$$;

revoke all on function public.get_phone_by_username(text) from public;
grant execute on function public.get_phone_by_username(text) to anon, authenticated;
