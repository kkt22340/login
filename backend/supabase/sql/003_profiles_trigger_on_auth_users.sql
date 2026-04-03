-- auth.users 신규 생성 시 profiles 자동 생성 트리거
-- 이메일 인증(Confirm email) ON 환경에서, signUp 직후 session이 없어도 profiles가 생기게 하기 위함

-- 1) 트리거 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, created_at, display_name)
  values (new.id, now(), null)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) 기존 트리거 정리 후 재생성
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

