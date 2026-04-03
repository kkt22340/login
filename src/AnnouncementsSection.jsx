import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

/** @typedef {{ title: string; body: string; image_url?: string | null }} FallbackNotice */

function AnnouncementItem({ row }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <article className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/50">
      {row.image_url && !imgFailed ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-stone-200">
          <img
            src={row.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : row.image_url && imgFailed ? (
        <div className="flex aspect-[16/10] w-full items-center justify-center bg-stone-200 text-xs text-stone-500">
          이미지를 불러올 수 없어요
        </div>
      ) : null}
      <div className="p-4">
        {row.title ? (
          <h3 className="font-semibold text-stone-900">{row.title}</h3>
        ) : null}
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {row.body || '—'}
        </div>
        {row.published_at ? (
          <p className="mt-3 text-xs text-stone-400">
            {new Date(row.published_at).toLocaleString('ko-KR')}
          </p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * @param {{
 *   limit?: number
 *   heading?: string
 *   subheading?: string
 *   headingId?: string
 *   fallbackNotice?: FallbackNotice | null
 * }} [props]
 */
export default function AnnouncementsSection({
  limit,
  heading = '센터 공지',
  subheading = '필라테스 스튜디오 소식을 확인하세요.',
  headingId = 'announcements-heading',
  fallbackNotice = null,
} = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const displayRows = useMemo(() => {
    if (rows.length > 0) return rows
    if (error) return []
    if (fallbackNotice) {
      return [
        {
          id: 'fallback-local',
          title: fallbackNotice.title,
          body: fallbackNotice.body,
          image_url: fallbackNotice.image_url ?? null,
          published_at: null,
        },
      ]
    }
    return []
  }, [rows, fallbackNotice, error])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        let q = supabase
          .from('center_announcements')
          .select('id, title, body, image_url, published_at')
          .eq('is_published', true)
          .order('sort_order', { ascending: false })
          .order('published_at', { ascending: false })
        if (limit != null && limit > 0) {
          q = q.limit(limit)
        }
        const { data, error: qErr } = await q

        if (qErr) throw qErr
        if (!cancelled) setRows(data ?? [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.message ?? '공지를 불러오지 못했어요.')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [limit])

  return (
    <section
      className="w-full min-w-0 rounded-2xl border border-stone-200/90 bg-white/95 p-6 shadow-lg shadow-stone-200/40 backdrop-blur-sm"
      aria-labelledby={headingId}
    >
      <div className="border-b border-stone-200/80 pb-4">
        <h2
          id={headingId}
          className="text-lg font-semibold tracking-tight text-stone-900"
        >
          {heading}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{subheading}</p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {loading ? (
          <p className="text-sm text-stone-500">불러오는 중...</p>
        ) : displayRows.length === 0 ? (
          <p className="text-sm text-stone-500">등록된 공지가 없어요.</p>
        ) : (
          displayRows.map((row) => <AnnouncementItem key={row.id} row={row} />)
        )}
      </div>
    </section>
  )
}
