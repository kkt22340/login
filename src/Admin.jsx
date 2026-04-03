import { useEffect, useMemo, useState } from 'react'
import { adminResetUserPassword } from './lib/adminResetPassword.js'
import { supabase } from './lib/supabaseClient'

function dateInputValue(isoOrDate) {
  if (!isoOrDate) return ''
  const s = String(isoOrDate)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function formatKoreanDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR')
}

function MemberRow({ profile, saving, onPatch, onDelete, deleting, resettingPassword, onResetPassword }) {
  const [name, setName] = useState(profile.display_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [credits, setCredits] = useState(String(profile.remaining_credits ?? 0))
  const [registered, setRegistered] = useState(dateInputValue(profile.registration_date))
  const [expires, setExpires] = useState(dateInputValue(profile.membership_expires_at))
  const [notes, setNotes] = useState(profile.admin_notes ?? '')

  useEffect(() => {
    setName(profile.display_name ?? '')
    setPhone(profile.phone ?? '')
    setCredits(String(profile.remaining_credits ?? 0))
    setRegistered(dateInputValue(profile.registration_date))
    setExpires(dateInputValue(profile.membership_expires_at))
    setNotes(profile.admin_notes ?? '')
  }, [profile])

  async function saveIfChanged(updates, compare) {
    if (compare()) return
    await onPatch(profile.id, updates)
  }

  const inputCls =
    'w-full min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'
  const notesCls =
    'min-h-[52px] w-full min-w-[160px] resize-y rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'

  return (
    <tr className="hover:bg-stone-50">
      <td className="px-2 py-2 align-top">
        <input
          aria-label="회원 이름"
          value={name}
          disabled={saving}
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            saveIfChanged({ display_name: name.trim() || null }, () =>
              (name.trim() || '') === (profile.display_name?.trim() || '')
            )
          }
          placeholder="이름"
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          aria-label="연락처"
          value={phone}
          disabled={saving}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() =>
            saveIfChanged({ phone: phone.trim() || null }, () =>
              (phone.trim() || '') === (profile.phone?.trim() || '')
            )
          }
          placeholder="전화번호"
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          aria-label="잔여 세션"
          type="number"
          min={0}
          value={credits}
          disabled={saving}
          onChange={(e) => setCredits(e.target.value)}
          onBlur={() => {
            const n = Number.parseInt(String(credits).trim(), 10)
            const next = Number.isNaN(n) ? 0 : Math.max(0, n)
            if (next !== Number(profile.remaining_credits ?? 0)) {
              setCredits(String(next))
              onPatch(profile.id, { remaining_credits: next })
            } else {
              setCredits(String(profile.remaining_credits ?? 0))
            }
          }}
          className={`${inputCls} max-w-[5.5rem]`}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          aria-label="등록 일"
          type="date"
          value={registered}
          disabled={saving}
          onChange={(e) => setRegistered(e.target.value)}
          onBlur={() => {
            const next = registered.trim() || null
            const prev = dateInputValue(profile.registration_date) || null
            if (next !== prev) {
              onPatch(profile.id, { registration_date: next })
            }
          }}
          className={inputCls}
        />
        <p className="mt-1 text-[11px] leading-snug text-stone-400">
          가입 시각: {formatKoreanDateTime(profile.created_at)}
        </p>
      </td>
      <td className="px-2 py-2 align-top">
        <input
          aria-label="마감 일"
          type="date"
          value={expires}
          disabled={saving}
          onChange={(e) => setExpires(e.target.value)}
          onBlur={() => {
            const next = expires.trim() || null
            const prev = dateInputValue(profile.membership_expires_at) || null
            if (next !== prev) {
              onPatch(profile.id, { membership_expires_at: next })
            }
          }}
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <textarea
          aria-label="특이 사항"
          value={notes}
          disabled={saving}
          rows={2}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() =>
            saveIfChanged({ admin_notes: notes.trim() || null }, () =>
              (notes.trim() || '') === (profile.admin_notes?.trim() || '')
            )
          }
          placeholder="메모"
          className={notesCls}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
          {saving ? (
            <span className="text-xs text-stone-400">저장 중...</span>
          ) : null}
          <button
            type="button"
            onClick={() => onResetPassword(profile.id)}
            disabled={deleting || saving || resettingPassword}
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            {resettingPassword ? '처리 중...' : '비밀번호 초기화'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(profile.id)}
            disabled={deleting || saving || resettingPassword}
            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-800 hover:bg-rose-100 disabled:opacity-60"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function Admin() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [resettingPasswordId, setResettingPasswordId] = useState('')
  const [nameSearch, setNameSearch] = useState('')

  const filteredProfiles = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => (p.display_name ?? '').toLowerCase().includes(q))
  }, [profiles, nameSearch])

  async function loadProfiles() {
    setError('')
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          'id, created_at, display_name, phone, remaining_credits, registration_date, membership_expires_at, admin_notes'
        )
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setProfiles(data ?? [])
    } catch (err) {
      setError(err?.message ?? '회원 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function patchProfile(id, updates) {
    setError('')
    setSavingId(id)
    try {
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', id)
      if (updateError) throw updateError
      await loadProfiles()
    } catch (err) {
      setError(err?.message ?? '저장에 실패했어요.')
    } finally {
      setSavingId(null)
    }
  }

  async function resetMemberPassword(id) {
    const pw = window.prompt('새 비밀번호를 입력하세요 (6자 이상).', '')
    if (pw == null) return
    if (pw.length < 6) {
      setError('비밀번호는 6자 이상이에요.')
      return
    }
    const pw2 = window.prompt('새 비밀번호를 한 번 더 입력하세요.', '')
    if (pw2 !== pw) {
      setError('비밀번호가 서로 달라요.')
      return
    }
    setError('')
    setResettingPasswordId(id)
    try {
      await adminResetUserPassword(id, pw)
      window.alert('비밀번호를 초기화했어요. 회원에게 새 비밀번호를 안내해주세요.')
    } catch (err) {
      setError(err?.message ?? '비밀번호 초기화에 실패했어요.')
    } finally {
      setResettingPasswordId('')
    }
  }

  async function deleteProfile(id) {
    if (!id) return
    if (!window.confirm('이 회원 프로필을 삭제할까요? 연결된 예약 등은 정책에 따라 제한될 수 있어요.')) {
      return
    }
    setError('')
    setDeletingId(id)
    try {
      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', id)
      if (deleteError) throw deleteError
      await loadProfiles()
    } catch (err) {
      setError(err?.message ?? '삭제에 실패했어요.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">회원 목록</h1>
          <p className="mt-1 text-sm text-stone-500">
            센터 회원 정보를 조회하고, 칸을 벗어나면 변경 사항이 저장됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProfiles}
          disabled={loading}
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
        >
          새로고침
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">전체 회원</h2>
            <label htmlFor="admin-name-search" className="sr-only">
              이름으로 검색
            </label>
            <input
              id="admin-name-search"
              type="search"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="이름으로 검색"
              autoComplete="off"
              className="mt-2 w-full max-w-md rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
          <div className="shrink-0 text-sm text-stone-500 sm:text-right">
            전체 <span className="font-medium text-stone-800">{profiles.length}</span>명
            {nameSearch.trim() ? (
              <>
                {' '}
                · 검색{' '}
                <span className="font-medium text-stone-800">{filteredProfiles.length}</span>명
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-stone-200">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    회원 이름
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    연락처
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    잔여 세션
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    등록 일
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    마감 일
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    특이 사항
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-stone-500">
                      불러오는 중...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-stone-500">
                      표시할 회원이 없어요.
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-stone-500">
                      검색 조건에 맞는 회원이 없어요.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => (
                    <MemberRow
                      key={p.id}
                      profile={p}
                      saving={savingId === p.id}
                      onPatch={patchProfile}
                      onDelete={deleteProfile}
                      deleting={deletingId === p.id}
                      resettingPassword={resettingPasswordId === p.id}
                      onResetPassword={resetMemberPassword}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          등록 일은 센터에 등록된 날짜입니다. 아래 &quot;가입 시각&quot;은 계정(프로필)이 처음 만들어진
          시각이에요. 마감 일은 회원권 종료일로 쓰면 됩니다.
        </p>
      </div>
    </div>
  )
}
