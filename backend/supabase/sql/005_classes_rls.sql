-- classes 테이블 RLS: 로그인 사용자는 조회, 관리자만 등록/수정/삭제
-- `public.is_admin(uuid)` 함수가 이미 있어야 합니다 (001 스크립트).

alter table public.classes enable row level security;

drop policy if exists "classes_select_authenticated" on public.classes;
create policy "classes_select_authenticated"
on public.classes
for select
to authenticated
using (true);

drop policy if exists "classes_insert_admin" on public.classes;
create policy "classes_insert_admin"
on public.classes
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "classes_update_admin" on public.classes;
create policy "classes_update_admin"
on public.classes
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "classes_delete_admin" on public.classes;
create policy "classes_delete_admin"
on public.classes
for delete
to authenticated
using (public.is_admin(auth.uid()));
