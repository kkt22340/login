-- 아이디(username)로 로그인 시도에 필요한 연락처: 전화(우선) + auth 이메일(대시보드 생성 계정 등)

create or replace function public.get_login_contact_by_username(p_username text)
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
  where lower(trim(p.username)) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_login_contact_by_username(text) from public;
grant execute on function public.get_login_contact_by_username(text) to anon, authenticated;
