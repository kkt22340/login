import { useCallback, useEffect, useState } from 'react'
import { friendlyAdminDbError } from './adminErrors'
import { supabase } from './lib/supabaseClient'

const emptyForm = {
  id: null,
  title: '',
  body: '',
  image_url: '',
  sort_order: 0,
  is_published: true,
}

export default function AdminAnnouncements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase
        .from('center_announcements')
        .select('id, title, body, image_url, sort_order, is_published, published_at')
        .order('sort_order', { ascending: false })
        .order('published_at', { ascending: false })
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

  function startEdit(row) {
    setForm({
      id: row.id,
      title: row.title ?? '',
      body: row.body ?? '',
      image_url: row.image_url ?? '',
      sort_order: Number(row.sort_order ?? 0),
      is_published: Boolean(row.is_published),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearForm() {
    setForm(emptyForm)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        image_url: form.image_url.trim() || null,
        sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
        is_published: form.is_published,
      }
      if (!payload.title) {
        setError('제목을 입력해주세요.')
        return
      }

      if (form.id) {
        const { error: uErr } = await supabase
          .from('center_announcements')
          .update(payload)
          .eq('id', form.id)
        if (uErr) throw uErr
      } else {
        const { error: iErr } = await supabase.from('center_announcements').insert(payload)
        if (iErr) throw iErr
      }
      clearForm()
      await load()
    } catch (err) {
      setError(friendlyAdminDbError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!id) return
    if (!window.confirm('이 공지를 삭제할까요?')) return
    setError('')
    setDeletingId(id)
    try {
      const { error: dErr } = await supabase.from('center_announcements').delete().eq('id', id)
      if (dErr) throw dErr
      if (form.id === id) clearForm()
      await load()
    } catch (err) {
      setError(friendlyAdminDbError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">공지 관리</h1>
        <p className="mt-1 text-sm text-stone-500">
          로그인 화면에 보이는 공지입니다. 이미지는 URL로 등록하세요(예: Supabase Storage 공개 URL).
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50"
      >
        <h2 className="text-lg font-semibold text-stone-900">
          {form.id ? '공지 수정' : '새 공지'}
        </h2>
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-stone-500">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
              placeholder="공지 제목"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-500">내용</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={5}
              className={inputCls}
              placeholder="공지 내용"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-500">이미지 URL</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs text-stone-500">정렬 (큰 숫자가 위)</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className={`${inputCls} max-w-[8rem]`}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="rounded border-stone-300 text-pink-600 focus:ring-pink-500"
              />
              게시
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-pink-500/25 hover:bg-pink-500 disabled:opacity-60"
          >
            {saving ? '저장 중...' : form.id ? '수정 저장' : '등록'}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={clearForm}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50"
            >
              새로 작성
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">등록된 공지</h2>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
          >
            새로고침
          </button>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-stone-500">불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-stone-500">공지가 없어요.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-stone-900">{row.title || '(제목 없음)'}</span>
                    {!row.is_published ? (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                        비공개
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{row.body || '—'}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    정렬 {row.sort_order} ·{' '}
                    {row.published_at
                      ? new Date(row.published_at).toLocaleString('ko-KR')
                      : '-'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:bg-stone-50"
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    disabled={deletingId === row.id}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {deletingId === row.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
