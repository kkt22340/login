-- 원자적 수업 예약: reservations INSERT + classes.enrolled_count +1 + profiles.remaining_credits -1
-- 클라이언트에서 여러 번 호출해도 DB 트랜잭션으로 일관성 유지

create or replace function public.book_class(p_class_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_credits integer;
  c_capacity integer;
  c_enrolled integer;
  c_starts timestamptz;
  r_id uuid;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'NO_PROFILE';
  end if;

  if exists (
    select 1 from public.reservations
    where user_id = uid
      and class_id = p_class_id
      and status in ('pending', 'confirmed')
  ) then
    raise exception 'ALREADY_BOOKED';
  end if;

  -- 같은 수업 예약은 수업 행을 먼저 잠가 동시성을 정리
  select capacity, enrolled_count, starts_at
  into c_capacity, c_enrolled, c_starts
  from public.classes
  where id = p_class_id
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if c_starts <= now() then
    raise exception 'CLASS_STARTED';
  end if;

  if c_enrolled >= c_capacity then
    raise exception 'CLASS_FULL';
  end if;

  select remaining_credits into v_credits
  from public.profiles
  where id = uid
  for update;

  if v_credits is null or v_credits < 1 then
    raise exception 'NO_CREDITS';
  end if;

  insert into public.reservations (user_id, class_id, status)
  values (uid, p_class_id, 'confirmed')
  returning id into r_id;

  update public.classes
  set enrolled_count = enrolled_count + 1
  where id = p_class_id;

  update public.profiles
  set remaining_credits = remaining_credits - 1
  where id = uid;

  return r_id;
end;
$$;

revoke all on function public.book_class(uuid) from public;
grant execute on function public.book_class(uuid) to authenticated;
