-- get_phone_by_username: auth.users.phone이 없을 때(프로토타입 이메일 가입 등) profiles.phone 사용

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
  select coalesce(nullif(trim(u.phone), ''), nullif(trim(p.phone), '')) into v_phone
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where lower(trim(p.username)) = lower(trim(p_username))
  limit 1;

  return v_phone;
end;
$$;

revoke all on function public.get_phone_by_username(text) from public;
grant execute on function public.get_phone_by_username(text) to anon, authenticated;
