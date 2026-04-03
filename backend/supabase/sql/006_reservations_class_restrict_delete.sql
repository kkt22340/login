-- 수업(classes) 삭제 시 예약(reservations)이 남아 있으면 DB 레벨에서 삭제 거부
-- (앱에서도 예약 건수를 확인해 안내하지만, 이 제약으로 실수 방지)

alter table public.reservations
  drop constraint if exists reservations_class_id_fkey;

alter table public.reservations
  add constraint reservations_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete restrict;
