import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudioBrand from './StudioBrand.jsx'
import { friendlyCancelError } from './bookingErrors'
import { supabase } from './lib/supabaseClient'

/** 수업 시작 24시간 전 시각 이전에만 취소 가능 (그 시각 이후에는 마감) */
function canCancelByPolicy(startsAtIso, status) {
  if (status !== 'confirmed' && status !== 'pending') return false
  const start = new Date(startsAtIso).getTime()
  if (Number.isNaN(start)) return false
  if (start <= Date.now()) return false
  const cancelDeadline = start - 24 * 60 * 60 * 1000
  return Date.now() < cancelDeadline
}

export default function MyReservations() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [banner, setBanner] = useState({ type: '', text: '' })

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase
        .from('reservations')
        .select(
          `
          id,
          status,
          created_at,
          classes (
            id,
            title,
            instructor_name,
            starts_at,
            ends_at
          )
        `
        )
        .order('created_at', { ascending: false })

      if (qErr) throw qErr
      setRows(data ?? [])
    } catch (err) {
      setError(err?.message ?? '예약 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  async function cancelBooking(reservationId) {
    setBanner({ type: '', text: '' })
    if (!window.confirm('이 예약을 취소할까요? 수강권 1회가 돌아옵니다.')) return
    setActionId(reservationId)
    try {
      const { error: rpcErr } = await supabase.rpc('cancel_booking', {
        p_reservation_id: reservationId,
      })
      if (rpcErr) throw rpcErr
      setBanner({ type: 'ok', text: '예약이 취소되었어요.' })
      await load()
    } catch (err) {
      setBanner({ type: 'err', text: friendlyCancelError(err) })
    } finally {
      setActionId(null)
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
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">내 예약 관리</h1>
          <p className="mt-1 text-sm text-stone-500">
            수업 시작 24시간 전까지 취소할 수 있어요.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/book')}
            className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-800 shadow-sm hover:bg-pink-100"
          >
            수업 예약
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
          >
            새로고침
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {banner.text ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              banner.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {loading ? (
            <p className="text-sm text-stone-500">불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-stone-500">예약 내역이 없어요.</p>
          ) : (
            rows.map((row) => {
              const cls = row.classes
              const startsAt = cls?.starts_at
              const canCancel =
                cls &&
                canCancelByPolicy(startsAt, row.status)
              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-stone-200/90 bg-white/90 p-5 shadow-lg shadow-stone-200/50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-stone-900">
                          {cls?.title ?? '(수업 정보 없음)'}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.status === 'cancelled'
                              ? 'bg-stone-200 text-stone-600'
                              : row.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {row.status === 'cancelled'
                            ? '취소됨'
                            : row.status === 'confirmed'
                              ? '예약확정'
                              : row.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        강사 {cls?.instructor_name ?? '-'}
                      </p>
                      <p className="mt-2 text-sm text-stone-600">
                        {startsAt
                          ? new Date(startsAt).toLocaleString('ko-KR')
                          : '-'}{' '}
                        시작
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        예약일 {createdAtLabel(row.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      {row.status !== 'cancelled' ? (
                        <button
                          type="button"
                          disabled={!canCancel || actionId === row.id}
                          onClick={() => cancelBooking(row.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionId === row.id
                            ? '처리 중...'
                            : !canCancel
                              ? '취소 불가'
                              : '취소하기'}
                        </button>
                      ) : null}
                      {!canCancel && row.status !== 'cancelled' ? (
                        <p className="max-w-[220px] text-right text-xs text-stone-500">
                          시작 24시간 전이 지나면 취소할 수 없어요.
                        </p>
                      ) : null}
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

function createdAtLabel(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR')
}
