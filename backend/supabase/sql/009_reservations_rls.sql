-- 본인 예약만 조회 (내 예약 페이지·조인용)
alter table public.reservations enable row level security;

drop policy if exists "reservations_select_own" on public.reservations;
create policy "reservations_select_own"
on public.reservations
for select
to authenticated
using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE는 RPC(book_class / cancel_booking)에서 SECURITY DEFINER로 처리
