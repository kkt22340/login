-- 예약 취소: status=cancelled, enrolled_count -1, remaining_credits +1
-- 수업 시작 시각 기준 24시간 "이내"가 되면 취소 불가 (즉 시작 24시간 전 시점 이후에는 버튼 비활성 + RPC 차단)

create or replace function public.cancel_booking(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r_user uuid;
  r_status text;
  r_class uuid;
  c_starts timestamptz;
  c_enrolled integer;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select user_id, status, class_id
  into r_user, r_status, r_class
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if r_user <> uid then
    raise exception 'NOT_YOUR_RESERVATION';
  end if;

  if r_status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  if r_status not in ('pending', 'confirmed') then
    raise exception 'CANNOT_CANCEL_STATUS';
  end if;

  select starts_at, enrolled_count
  into c_starts, c_enrolled
  from public.classes
  where id = r_class
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  -- 시작 24시간 전 시각 이후에는 취소 불가 (수업 시작까지 24시간 미만 남음)
  if c_starts <= (now() + interval '24 hours') then
    raise exception 'TOO_LATE_TO_CANCEL';
  end if;

  update public.reservations
  set status = 'cancelled'
  where id = p_reservation_id;

  update public.classes
  set enrolled_count = greatest(0, enrolled_count - 1)
  where id = r_class;

  update public.profiles
  set remaining_credits = remaining_credits + 1
  where id = uid;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
