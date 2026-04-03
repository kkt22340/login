-- 로그인 화면용 센터 공지 (이미지 URL + 본문). 비로그인(anon) 조회 가능.
create table if not exists public.center_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists center_announcements_sort_idx
  on public.center_announcements (is_published, sort_order desc, published_at desc);

alter table public.center_announcements enable row level security;

drop policy if exists "center_announcements_select_public" on public.center_announcements;
drop policy if exists "center_announcements_select_admin" on public.center_announcements;
drop policy if exists "center_announcements_insert_admin" on public.center_announcements;
drop policy if exists "center_announcements_update_admin" on public.center_announcements;
drop policy if exists "center_announcements_delete_admin" on public.center_announcements;

-- 비로그인·일반 회원: 게시된 공지만
create policy "center_announcements_select_public"
on public.center_announcements
for select
to anon, authenticated
using (is_published = true);

-- 관리자: 전체 공지(비공개 포함) 조회
create policy "center_announcements_select_admin"
on public.center_announcements
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "center_announcements_insert_admin"
on public.center_announcements
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "center_announcements_update_admin"
on public.center_announcements
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "center_announcements_delete_admin"
on public.center_announcements
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- 샘플 1건(테이블이 비어 있을 때만)
insert into public.center_announcements (title, body, image_url, sort_order)
select
  '스튜디오 공지',
  '수업 일정 및 휴관 안내는 이곳에 올려주세요. 회원 여러분의 건강한 운동을 응원합니다.',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',
  0
where not exists (select 1 from public.center_announcements limit 1);
