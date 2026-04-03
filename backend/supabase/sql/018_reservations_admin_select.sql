-- 관리자: 전체 예약 조회 (예약 현황 화면·수업 삭제 시 건수 확인 등)
-- `public.is_admin(uuid)` 가 있어야 합니다 (001 스크립트).

drop policy if exists "reservations_select_admin" on public.reservations;
create policy "reservations_select_admin"
on public.reservations
for select
to authenticated
using (public.is_admin(auth.uid()));
