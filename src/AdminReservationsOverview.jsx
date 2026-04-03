import { useCallback, useEffect, useState } from 'react'
import { friendlyAdminDbError } from './adminErrors'
import { supabase } from './lib/supabaseClient'

function formatKoreanDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminReservationsOverview() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const nowIso = new Date().toISOString()
      const { data, error: qErr } = await supabase
        .from('classes')
        .select(
          `
          id,
          title,
          instructor_name,
          starts_at,
          ends_at,
          capacity,
          enrolled_count,
          reservations (
            id,
            status,
            profiles ( display_name )
          )
        `
        )
        .gte('ends_at', nowIso)
        .order('starts_at', { ascending: true })

      if (qErr) throw qErr
      setRows(data ?? [])
    } catch (err) {
      setError(friendlyAdminDbError(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            현재 개설된 수업 예약 현황
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            종료되지 않은 수업별 정원·예약 인원과 예약자 이름을 확인할 수 있어요.
          </p>
        </div>
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
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-stone-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-stone-600">표시할 수업이 없어요.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {rows.map((c) => {
            const active = (c.reservations ?? []).filter((r) =>
              ['pending', 'confirmed'].includes(r.status)
            )
            const cap = Number(c.capacity ?? 0)
            const enrolled = Number(c.enrolled_count ?? 0)
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-stone-200/90 bg-white/90 p-5 shadow-lg shadow-stone-200/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                  <h2 className="text-lg font-semibold text-stone-900">{c.title}</h2>
                  <span className="text-sm font-medium text-pink-800">
                    예약 {enrolled} / 정원 {cap}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {c.instructor_name} · {formatKoreanDateTime(c.starts_at)} ~{' '}
                  {formatKoreanDateTime(c.ends_at)}
                </p>
                {active.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">아직 예약이 없어요.</p>
                ) : (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-stone-800">
                    {active.map((r) => (
                      <li key={r.id}>
                        {r.profiles?.display_name?.trim() || '이름 미등록'}{' '}
                        <span className="text-stone-500">({r.status})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
