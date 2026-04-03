import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AnnouncementsSection from './AnnouncementsSection.jsx'
import StudioBrand from './StudioBrand.jsx'
import { useAuth } from './AuthContext'
import { supabase } from './lib/supabaseClient'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 로컬 기준 YYYY-MM-DD */
function localDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function upcomingReservationHint(rows) {
  const now = Date.now()
  const todayKey = localDateKey(new Date())
  const tm = new Date()
  tm.setDate(tm.getDate() + 1)
  const tomorrowKey = localDateKey(tm)

  const future = []
  for (const row of rows) {
    if (row.status === 'cancelled') continue
    const starts = row.classes?.starts_at
    if (!starts) continue
    const t = new Date(starts).getTime()
    if (Number.isNaN(t) || t <= now) continue
    future.push(localDateKey(new Date(starts)))
  }
  if (future.length === 0) return null

  const hasToday = future.some((k) => k === todayKey)
  const hasTomorrow = future.some((k) => k === tomorrowKey)
  if (hasToday) return '오늘 예약된 수업이 있어요.'
  if (hasTomorrow) return '내일 예약된 수업이 있어요.'
  return '곧 다가오는 예약이 있어요.'
}

/** DB에 게시된 공지가 없을 때 대시보드에만 보여 줄 샘플 1건 */
const DASHBOARD_NOTICE_FALLBACK = {
  title: '스튜디오 안내',
  body:
    '오늘도 좋은 하루 보내세요. 수업·예약 문의는 센터로 연락 주시거나 앱에서 수업 예약 메뉴를 이용해 주세요.',
  image_url:
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, isAdmin, profile } = useAuth()

  const greetingName =
    profile?.display_name?.trim() || '회원'

  const [upcomingHint, setUpcomingHint] = useState(null)

  useEffect(() => {
    if (!session?.user) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('id, status, classes (starts_at)')
          .eq('user_id', uid)
          .in('status', ['confirmed', 'pending'])
        if (error) throw error
        if (!cancelled) setUpcomingHint(upcomingReservationHint(data ?? []))
      } catch {
        if (!cancelled) setUpcomingHint(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const adminDenied = Boolean(location.state?.adminDenied)

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="border-b border-stone-200/90 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <StudioBrand variant="hero" />
              <p className="mt-4 text-lg text-stone-700">
                <span className="font-semibold text-stone-900">{greetingName}</span>님, 안녕하세요.{' '}
                <span aria-hidden="true">😊</span>
              </p>
              {upcomingHint ? (
                <p className="mt-4 text-xl font-semibold leading-snug text-stone-900 sm:text-2xl">
                  {upcomingHint}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50 hover:text-stone-900"
            >
              로그아웃
            </button>
          </div>
        </header>

        <section className="border-b border-stone-200/90 py-8" aria-label="메뉴">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            바로 가기
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/book')}
                  className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-left text-sm font-medium text-pink-800 shadow-sm transition hover:bg-pink-100"
                >
                  수업 예약
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-reservations')}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  내 예약
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-page')}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  마이페이지
                </button>
              </>
            ) : null}
            {isAdmin ? (
              <>
                <Link
                  to="/admin/classes"
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  수업 등록
                </Link>
                <Link
                  to="/admin"
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  회원 관리
                </Link>
                <Link
                  to="/admin/reservations"
                  className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-left text-sm font-medium text-pink-800 shadow-sm transition hover:bg-pink-100"
                >
                  현재 개설된 수업 예약 현황
                </Link>
                <Link
                  to="/admin/announcements"
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  공지 관리
                </Link>
              </>
            ) : null}
          </div>
        </section>

        <section className="mt-10 border-t border-stone-200/90 pt-10" aria-label="센터 공지 미리보기">
          <AnnouncementsSection
            limit={1}
            heading="센터 공지"
            subheading="최근 게시된 소식입니다."
            headingId="dashboard-announcements-heading"
            fallbackNotice={DASHBOARD_NOTICE_FALLBACK}
          />
        </section>

        {adminDenied ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            관리자 전용 페이지에 들어갈 수 없어요. Supabase에서 해당 계정의{' '}
            <code className="rounded bg-amber-100/80 px-1">profiles.is_admin</code>이
            true인지, 그리고 로그인한 계정과 UUID가 맞는지 확인해주세요.
          </div>
        ) : null}
      </div>
    </div>
  )
}
