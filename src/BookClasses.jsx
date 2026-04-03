import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudioBrand from './StudioBrand.jsx'
import { friendlyAdminDbError } from './adminErrors'
import { friendlyBookError } from './bookingErrors'
import { supabase } from './lib/supabaseClient'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 로컬 기준 YYYY-MM-DD */
function localDateKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatTabLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('ko-KR', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  })
}

function remainingSeats(c) {
  const cap = Number(c?.capacity ?? 0)
  const enr = Number(c?.enrolled_count ?? 0)
  return Math.max(0, cap - enr)
}

export default function BookClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDate, setFilterDate] = useState(null)
  const [calendarValue, setCalendarValue] = useState('')
  const [myCredits, setMyCredits] = useState(null)
  const [bookingClassId, setBookingClassId] = useState(null)
  const [bookError, setBookError] = useState('')
  const [bookSuccess, setBookSuccess] = useState('')

  const loadMyCredits = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) return
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('remaining_credits')
        .eq('id', session.user.id)
        .maybeSingle()
      if (qErr) throw qErr
      setMyCredits(data?.remaining_credits ?? 0)
    } catch {
      setMyCredits(null)
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const nowIso = new Date().toISOString()
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(
          'id, title, instructor_name, starts_at, ends_at, capacity, enrolled_count'
        )
        .gt('starts_at', nowIso)
        .order('starts_at', { ascending: true })

      if (fetchError) throw fetchError
      setClasses(data ?? [])
    } catch (err) {
      setError(friendlyAdminDbError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
    loadMyCredits()
  }, [loadClasses, loadMyCredits])

  useEffect(() => {
    const channel = supabase
      .channel('book-classes-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => {
          loadClasses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadClasses])

  const dateKeys = useMemo(() => {
    const set = new Set()
    for (const c of classes) {
      const k = localDateKey(c.starts_at)
      if (k) set.add(k)
    }
    return [...set].sort()
  }, [classes])

  const filtered = useMemo(() => {
    if (!filterDate) return classes
    return classes.filter((c) => localDateKey(c.starts_at) === filterDate)
  }, [classes, filterDate])

  function setFilterFromCalendar(value) {
    setCalendarValue(value)
    setFilterDate(value || null)
  }

  function selectTab(key) {
    setFilterDate(key)
    setCalendarValue(key ? key : '')
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  async function bookClass(classId) {
    setBookError('')
    setBookSuccess('')
    if (myCredits !== null && myCredits < 1) {
      setBookError('수강권이 없습니다')
      return
    }
    setBookingClassId(classId)
    try {
      const { error: rpcError } = await supabase.rpc('book_class', {
        p_class_id: classId,
      })
      if (rpcError) throw rpcError
      setBookSuccess('예약이 완료되었어요.')
      await loadClasses()
      await loadMyCredits()
    } catch (err) {
      setBookError(friendlyBookError(err))
    } finally {
      setBookingClassId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="border-b border-stone-200/90 pb-6">
          <div className="flex items-start justify-between gap-4">
            <StudioBrand variant="nav" to="/dashboard" />
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50 hover:text-stone-900"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="mt-6 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">수업 예약</h1>
          <p className="mt-1 text-sm text-stone-500">
            예정된 수업만 표시됩니다. 인원은 새로고침·실시간 반영을 사용해요.
          </p>
          {myCredits !== null ? (
            <p className="mt-2 text-sm text-stone-600">
              내 남은 수강권:{' '}
              <span className="font-semibold text-pink-700">{myCredits}</span>회
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/my-reservations')}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50"
          >
            내 예약
          </button>
          <button
            type="button"
            onClick={loadClasses}
            disabled={loading}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
          >
            새로고침
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-stone-200/90 bg-white/90 p-4 shadow-lg shadow-stone-200/50 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                날짜별 보기
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => selectTab(null)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    filterDate === null
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                      : 'border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50'
                  }`}
                >
                  전체
                </button>
                {dateKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectTab(key)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                      filterDate === key
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                        : 'border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50'
                    }`}
                  >
                    {formatTabLabel(key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <label className="text-xs text-stone-500" htmlFor="book-date">
                날짜 직접 선택
              </label>
              <input
                id="book-date"
                type="date"
                value={calendarValue}
                onChange={(e) => setFilterFromCalendar(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>
          {filterDate && !dateKeys.includes(filterDate) ? (
            <p className="mt-3 text-sm text-amber-800">
              선택한 날짜에 예정된 수업이 없어요. 탭에서 다른 날짜를 고르거나 &quot;전체&quot;를
              눌러보세요.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {bookError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {bookError}
          </div>
        ) : null}
        {bookSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {bookSuccess}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {loading ? (
            <p className="text-sm text-stone-500">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-stone-500">
              {classes.length === 0
                ? '예정된 수업이 없어요.'
                : '이 날짜에 표시할 수업이 없어요.'}
            </p>
          ) : (
            filtered.map((c) => {
              const left = remainingSeats(c)
              const soldOut = left <= 0
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-stone-200/90 bg-white/90 p-5 shadow-lg shadow-stone-200/50"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-stone-900">
                          {c.title}
                        </h2>
                        {soldOut ? (
                          <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                            매진
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        강사 {c.instructor_name}
                      </p>
                      <p className="mt-3 text-sm text-stone-600">
                        {c.starts_at
                          ? new Date(c.starts_at).toLocaleString('ko-KR')
                          : '-'}{' '}
                        —{' '}
                        {c.ends_at
                          ? new Date(c.ends_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      <div
                        className={`rounded-xl border px-4 py-2 text-center text-sm sm:min-w-[140px] ${
                          soldOut
                            ? 'border-stone-200 bg-stone-100 text-stone-500'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {soldOut ? (
                          '남은 자리 없음'
                        ) : (
                          <>
                            남은 자리{' '}
                            <span className="text-lg font-semibold">{left}</span>명
                          </>
                        )}
                      </div>
                      <p className="text-center text-xs text-stone-500 sm:text-right">
                        정원 {c.enrolled_count ?? 0} / {c.capacity}
                      </p>
                      <button
                        type="button"
                        disabled={
                          soldOut ||
                          bookingClassId === c.id ||
                          (myCredits !== null && myCredits < 1)
                        }
                        onClick={() => bookClass(c.id)}
                        className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-pink-500/25 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {bookingClassId === c.id
                          ? '처리 중...'
                          : soldOut
                            ? '매진'
                            : myCredits !== null && myCredits < 1
                              ? '수강권 없음'
                              : '예약하기'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
