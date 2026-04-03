import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudioBrand from './StudioBrand.jsx'
import { useAuth } from './AuthContext'
import { supabase } from './lib/supabaseClient'

function statusLabel(status) {
  if (status === 'confirmed') return '예약확정'
  if (status === 'cancelled') return '취소됨'
  if (status === 'pending') return '대기'
  return status ?? '-'
}

function creditNote(status) {
  if (status === 'confirmed') return '수강권 1회 사용'
  if (status === 'cancelled') return '취소 · 수강권 반환'
  if (status === 'pending') return '수강권 차감(대기)'
  return '—'
}

export default function MyPage() {
  const navigate = useNavigate()
  const { session, userId, refreshProfile } = useAuth()

  const [tab, setTab] = useState('credits')
  const [remaining, setRemaining] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [loadingCredits, setLoadingCredits] = useState(true)
  const [creditsError, setCreditsError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileOk, setProfileOk] = useState('')

  const loadCredits = useCallback(async () => {
    if (!userId) return
    setCreditsError('')
    setLoadingCredits(true)
    try {
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('remaining_credits')
        .eq('id', userId)
        .maybeSingle()
      if (pErr) throw pErr
      setRemaining(prof?.remaining_credits ?? 0)

      const { data: res, error: rErr } = await supabase
        .from('reservations')
        .select(
          `
          id,
          status,
          created_at,
          classes (
            title,
            starts_at,
            ends_at
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (rErr) throw rErr
      setHistoryRows(res ?? [])
    } catch (e) {
      setCreditsError(e?.message ?? '불러오지 못했어요.')
      setRemaining(null)
      setHistoryRows([])
    } finally {
      setLoadingCredits(false)
    }
  }, [userId])

  const loadProfileForm = useCallback(async () => {
    if (!userId) return
    setProfileError('')
    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, phone, address')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      setDisplayName(data?.display_name ?? '')
      setPhone(data?.phone ?? '')
      setAddress(data?.address ?? '')
    } catch (e) {
      setProfileError(e?.message ?? '프로필을 불러오지 못했어요.')
    } finally {
      setLoadingProfile(false)
    }
  }, [userId])

  useEffect(() => {
    if (!session?.user) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  useEffect(() => {
    loadCredits()
  }, [loadCredits])

  useEffect(() => {
    if (tab === 'profile') {
      loadProfileForm()
    }
  }, [tab, loadProfileForm])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!userId) return
    setProfileError('')
    setProfileOk('')
    setSavingProfile(true)
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        })
        .eq('id', userId)
      if (uErr) throw uErr
      setProfileOk('저장했어요.')
      await refreshProfile()
    } catch (e) {
      setProfileError(e?.message ?? '저장에 실패했어요.')
    } finally {
      setSavingProfile(false)
    }
  }

  const tabBtn = (active) =>
    `rounded-xl px-4 py-2 text-sm font-medium transition ${
      active
        ? 'border border-pink-200 bg-pink-50 text-pink-800 shadow-sm ring-1 ring-pink-200'
        : 'border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50'
    }`

  const inputCls =
    'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="border-b border-stone-200/90 pb-6">
          <div className="flex items-start justify-between gap-4">
            <StudioBrand variant="nav" />
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50 hover:text-stone-900"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">마이페이지</h1>
          <p className="mt-1 text-sm text-stone-500">
            수강권과 내 정보를 관리할 수 있어요.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className={tabBtn(tab === 'credits')} onClick={() => setTab('credits')}>
            나의 수강권
          </button>
          <button type="button" className={tabBtn(tab === 'profile')} onClick={() => setTab('profile')}>
            내 정보 관리
          </button>
        </div>

        {tab === 'credits' ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50">
              <h2 className="text-sm font-semibold text-stone-900">잔여 수강권</h2>
              <p className="mt-2 text-4xl font-bold tabular-nums text-pink-700">
                {loadingCredits ? '…' : remaining ?? '—'}
                <span className="ml-1 text-lg font-semibold text-stone-600">회</span>
              </p>
              <p className="mt-2 text-xs text-stone-500">
                예약 확정 시 1회 차감, 취소(정책 허용 시) 시 1회 복구됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50">
              <h2 className="text-sm font-semibold text-stone-900">사용 이력</h2>
              <p className="mt-1 text-xs text-stone-500">예약 기준으로 표시합니다.</p>

              {creditsError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {creditsError}
                </div>
              ) : null}

              {loadingCredits ? (
                <p className="mt-4 text-sm text-stone-500">불러오는 중...</p>
              ) : historyRows.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">예약 이력이 없어요.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-sm">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">수업</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">수업 일시</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">상태</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">수강권</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {historyRows.map((row) => {
                        const cls = row.classes
                        return (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-stone-800">{cls?.title ?? '—'}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                              {cls?.starts_at
                                ? new Date(cls.starts_at).toLocaleString('ko-KR')
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-stone-700">{statusLabel(row.status)}</td>
                            <td className="px-3 py-2 text-xs text-stone-600">{creditNote(row.status)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form
            onSubmit={saveProfile}
            className="mt-8 rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-lg shadow-stone-200/50"
          >
            <h2 className="text-sm font-semibold text-stone-900">내 정보</h2>
            <p className="mt-1 text-xs text-stone-500">이름·연락처·주소를 수정할 수 있어요.</p>

            {profileError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {profileError}
              </div>
            ) : null}
            {profileOk ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {profileOk}
              </div>
            ) : null}

            {loadingProfile ? (
              <p className="mt-4 text-sm text-stone-500">불러오는 중...</p>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-stone-500">이름</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputCls}
                    placeholder="표시 이름"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-500">휴대폰 번호</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    className={inputCls}
                    placeholder="01012345678"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-500">주소</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-y`}
                    placeholder="도로명 또는 지번 주소"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-pink-500/25 hover:bg-pink-500 disabled:opacity-60"
                >
                  {savingProfile ? '저장 중...' : '저장'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
