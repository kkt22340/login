-- 관리자 지정 스크립트
-- 1) Supabase Dashboard → Authentication → Users에서 관리자 계정의 UUID를 확인
-- 2) 아래 'YOUR-USER-UUID-HERE'를 해당 UUID로 바꾸고 실행

update public.profiles
set is_admin = true
where id = '6f0b7b5c-c4e6-4d22-91ec-a7b82ca0faf0';

-- 확인(옵션)
select id, email
from auth.users
where id = '6f0b7b5c-c4e6-4d22-91ec-a7b82ca0faf0';

select id, is_admin, display_name, created_at
from public.profiles
where id = '6f0b7b5c-c4e6-4d22-91ec-a7b82ca0faf0';

