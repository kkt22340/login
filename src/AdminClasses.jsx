import { useEffect, useState } from 'react'
import { friendlyAdminDbError } from './adminErrors'
import { supabase } from './lib/supabaseClient'

function toIsoFromDatetimeLocal(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** timestamptz → datetime-local 값 (브라우저 로컬) */
function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export default function AdminClasses() {
  const [title, setTitle] = useState('')
  const [instructorName, setInstructorName] = useState('')
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [endsAtLocal, setEndsAtLocal] = useState('')
  const [capacity, setCapacity] = useState('10')

  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [listError, setListError] = useState('')
  const [formInfo, setFormInfo] = useState('')
  const [listInfo, setListInfo] = useState('')

  /** 수정 중인 수업 id — 있으면 폼 제출 시 update */
  const [editingId, setEditingId] = useState(null)
  const [editingEnrolled, setEditingEnrolled] = useState(0)

  async function loadClasses() {
    setListError('')
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .order('starts_at', { ascending: true })

      if (fetchError) throw fetchError
      setClasses(data ?? [])
    } catch (err) {
      setListError(friendlyAdminDbError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  function resetForm() {
    setTitle('')
    setInstructorName('')
    setStartsAtLocal('')
    setEndsAtLocal('')
    setCapacity('10')
    setEditingId(null)
    setEditingEnrolled(0)
  }

  function startEdit(row) {
    if (!row?.id) return
    setFormError('')
    setFormInfo('')
    setEditingId(row.id)
    setEditingEnrolled(Number(row.enrolled_count ?? 0))
    setTitle(row.title ?? '')
    setInstructorName(row.instructor_name ?? '')
    setStartsAtLocal(toDatetimeLocalValue(row.starts_at))
    setEndsAtLocal(toDatetimeLocalValue(row.ends_at))
    setCapacity(String(row.capacity ?? 10))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setFormError('')
    setListError('')
    setFormInfo('')
    setListInfo('')
    const startsAt = toIsoFromDatetimeLocal(startsAtLocal)
    const endsAt = toIsoFromDatetimeLocal(endsAtLocal)
    const cap = Number.parseInt(capacity, 10)

    if (!title.trim()) {
      setFormError('수업명을 입력해주세요.')
      return
    }
    if (!instructorName.trim()) {
      setFormError('강사명을 입력해주세요.')
      return
    }
    if (!startsAt || !endsAt) {
      setFormError('시작·종료 날짜와 시간을 모두 선택해주세요.')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setFormError('종료 시간은 시작 시간보다 늦어야 해요.')
      return
    }
    if (!Number.isFinite(cap) || cap < 1) {
      setFormError('최대 정원은 1 이상의 숫자로 입력해주세요.')
      return
    }
    if (editingId !== null && cap < editingEnrolled) {
      setFormError(
        `정원은 현재 예약 인원(${editingEnrolled}명) 이상이어야 해요.`
      )
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('classes')
          .update({
            title: title.trim(),
            instructor_name: instructorName.trim(),
            starts_at: startsAt,
            ends_at: endsAt,
            capacity: cap,
          })
          .eq('id', editingId)
        if (updateError) throw updateError
        setFormInfo('수업을 수정했어요.')
        resetForm()
      } else {
        const { error: insertError } = await supabase.from('classes').insert({
          title: title.trim(),
          instructor_name: instructorName.trim(),
          starts_at: startsAt,
          ends_at: endsAt,
          capacity: cap,
          enrolled_count: 0,
        })
        if (insertError) throw insertError
        setFormInfo('수업이 등록되었어요.')
        resetForm()
      }
      await loadClasses()
    } catch (err) {
      setFormError(friendlyAdminDbError(err))
    } finally {
      setSaving(false)
    }
  }

  async function countActiveReservations(classId) {
    const { count, error } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .in('status', ['pending', 'confirmed'])
    if (error) return null
    return count ?? 0
  }

  async function deleteClass(row) {
    const id = row?.id
    if (!id) return

    setListError('')
    setListInfo('')

    const enrolled = Number(row?.enrolled_count ?? 0)
    if (enrolled > 0) {
      setListError(
        `이 수업에는 예약 인원이 ${enrolled}명 남아 있어요. 예약을 정리한 뒤 삭제해주세요.`
      )
      return
    }

    const resCount = await countActiveReservations(id)
    if (resCount !== null && resCount > 0) {
      setListError(
        `진행 중인 예약이 ${resCount}건 있어 삭제할 수 없어요. 예약을 취소한 뒤 다시 시도해주세요.`
      )
      return
    }

    const extra =
      resCount === null
        ? '\n\n(예약 건수를 확인하지 못했어요. 삭제가 막히면 DB 제약(006 스크립트) 메시지를 참고하세요.)'
        : ''
    if (!window.confirm(`이 수업을 삭제할까요?${extra}`)) return

    setDeletingId(id)
    try {
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
      if (deleteError) throw deleteError
      if (editingId === id) resetForm()
      setListInfo('삭제했어요.')
      await loadClasses()
    } catch (err) {
      setListError(friendlyAdminDbError(err))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">수업 등록</h1>
          <p className="mt-1 text-sm text-stone-500">
            수업을 등록·수정합니다. 상단 탭에서 회원 관리로 이동할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={loadClasses}
          disabled={loading}
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
        >
          새로고침
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {editingId ? '수업 수정' : '새 수업 등록'}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormError('')
                    setFormInfo('')
                    resetForm()
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 shadow-sm hover:bg-stone-50"
                >
                  수정 취소
                </button>
              ) : null}
            </div>
            {editingId ? (
              <p className="mt-2 text-xs text-amber-200/90">
                예약 {editingEnrolled}명 반영 중 — 정원은 이 값 이상으로만 줄일 수
                있어요.
              </p>
            ) : null}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-stone-600">수업명</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 필라테스 기초"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-stone-600">강사명</label>
                <input
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="강사 이름"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-stone-600">
                    시작 (날짜·시간)
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAtLocal}
                    onChange={(e) => setStartsAtLocal(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-stone-600">
                    종료 (날짜·시간)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAtLocal}
                    onChange={(e) => setEndsAtLocal(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-stone-600">최대 정원</label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {formError}
                </div>
              ) : null}
              {formInfo ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {formInfo}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-medium text-white shadow-md shadow-pink-500/25 hover:bg-pink-500 disabled:opacity-60"
              >
                {saving
                  ? editingId
                    ? '저장 중...'
                    : '등록 중...'
                  : editingId
                    ? '변경 저장'
                    : '수업 등록'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50">
            <h2 className="text-lg font-semibold">등록된 수업</h2>
            <p className="mt-1 text-sm text-stone-500">
              시작 시간 순 · 예약이 남아 있으면 삭제할 수 없어요.
            </p>

            {listInfo ? (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {listInfo}
              </div>
            ) : null}
            {listError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 whitespace-pre-line">
                {listError}
              </div>
            ) : null}

            <div className="mt-4 max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-sm text-stone-500">불러오는 중...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-stone-500">등록된 수업이 없어요.</p>
              ) : (
                classes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-900">{c.title}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          강사: {c.instructor_name}
                        </p>
                        <p className="mt-2 text-xs text-stone-500">
                          {c.starts_at
                            ? new Date(c.starts_at).toLocaleString()
                            : '-'}{' '}
                          ~{' '}
                          {c.ends_at
                            ? new Date(c.ends_at).toLocaleString()
                            : '-'}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          정원 {c.enrolled_count ?? 0} / {c.capacity}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          disabled={deletingId === c.id || editingId === c.id}
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClass(c)}
                          disabled={deletingId === c.id}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          {deletingId === c.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </div>
  )
}
