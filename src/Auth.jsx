import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementsSection from './AnnouncementsSection.jsx'
import StudioBrand from './StudioBrand.jsx'
import { isLikelyKRMobile, protoLoginEmailFromE164, toE164KR } from './phoneUtils'
import { supabase } from './lib/supabaseClient'

function friendlyAuthError(err) {
  const msg = String(err?.message ?? err ?? '')

  if (/invalid login credentials|invalid phone or password/i.test(msg)) {
    return '휴대폰 번호 또는 비밀번호가 올바르지 않아요.'
  }
  if (/phone.*not confirmed|not confirmed/i.test(msg)) {
    return '휴대폰 인증을 완료해주세요.'
  }
  if (/invalid otp|token.*invalid|otp.*expired/i.test(msg)) {
    return '인증번호가 올바르지 않거나 만료됐어요.'
  }
  if (/user already registered|already registered|phone.*exists/i.test(msg)) {
    return '이미 가입된 번호예요. 로그인해주세요.'
  }
  if (/password should be at least|password/i.test(msg)) {
    return '비밀번호 조건을 확인해주세요. (최소 6자 이상)'
  }
  if (/rate limit|too many/i.test(msg)) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'
  }
  if (/network|fetch/i.test(msg)) {
    return '네트워크 오류가 발생했어요. 인터넷 연결을 확인해주세요.'
  }
  if (/email not confirmed|confirm your email/i.test(msg)) {
    return '이메일 인증을 완료해주세요.'
  }

  return msg || '처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.'
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function buildBirthDate(y, m, d) {
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (!year || !month || !day) return null
  const maxD = daysInMonth(year, month)
  const dd = Math.min(day, maxD)
  const mm = String(month).padStart(2, '0')
  const ddStr = String(dd).padStart(2, '0')
  return `${year}-${mm}-${ddStr}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Auth() {
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [signupPhase, setSignupPhase] = useState('form')

  const [loginPhone, setLoginPhone] = useState('')
  const [password, setPassword] = useState('')

  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('1995')
  const [birthMonth, setBirthMonth] = useState('1')
  const [birthDay, setBirthDay] = useState('1')
  const [phoneRaw, setPhoneRaw] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [password2, setPassword2] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [otpCode, setOtpCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const title = useMemo(
    () =>
      mode === 'login'
        ? '로그인'
        : signupPhase === 'email_otp'
          ? '이메일 인증'
          : '회원가입',
    [mode, signupPhase]
  )

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    const list = []
    for (let i = y - 12; i >= 1940; i--) list.push(i)
    return list
  }, [])

  const maxDay = useMemo(() => {
    const y = Number(birthYear) || 2000
    const m = Number(birthMonth) || 1
    return daysInMonth(y, m)
  }, [birthYear, birthMonth])

  useEffect(() => {
    const d = Number(birthDay) || 1
    if (d > maxDay) setBirthDay(String(maxDay))
  }, [birthYear, birthMonth, maxDay, birthDay])

  function resetSignupForm() {
    setSignupPhase('form')
    setOtpCode('')
    setPendingEmail('')
    setPassword2('')
    setPasswordConfirm('')
    setSignupEmail('')
    setInfo('')
    setError('')
  }

  async function saveProfileRow(userId, payload) {
    const { error: upErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        display_name: payload.displayName,
        birth_date: payload.birthDate,
        phone: payload.phone,
        username: null,
      },
      { onConflict: 'id' }
    )
    if (upErr) throw upErr
  }

  async function onLogin(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const e164 = toE164KR(loginPhone)
      if (!isLikelyKRMobile(e164)) {
        setError('휴대폰 번호를 확인해주세요. (예: 01012345678)')
        return
      }

      const { data: contactRaw, error: rpcErr } = await supabase.rpc('get_login_contact_by_phone', {
        p_phone_e164: e164,
      })
      if (rpcErr) throw rpcErr
      const contact =
        contactRaw && typeof contactRaw === 'object'
          ? contactRaw
          : null
      const phone = contact?.phone ? String(contact.phone) : ''
      const email = contact?.email ? String(contact.email) : ''
      if (!phone && !email) {
        setError('등록된 휴대폰 번호를 찾을 수 없어요. 회원가입 여부를 확인해주세요.')
        return
      }

      const attempts = []
      const triedEmail = new Set()
      if (phone) {
        attempts.push(() =>
          supabase.auth.signInWithPassword({ phone, password })
        )
        const proto = protoLoginEmailFromE164(phone)
        if (proto) {
          triedEmail.add(proto.toLowerCase())
          attempts.push(() =>
            supabase.auth.signInWithPassword({ email: proto, password })
          )
        }
      }
      if (email && !triedEmail.has(email.toLowerCase())) {
        attempts.push(() =>
          supabase.auth.signInWithPassword({ email, password })
        )
      }

      let lastErr = null
      for (const run of attempts) {
        const { error: e } = await run()
        if (!e) {
          navigate('/dashboard')
          return
        }
        lastErr = e
      }
      if (lastErr) throw lastErr
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function onSignupRequestOtp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const birthDate = buildBirthDate(birthYear, birthMonth, birthDay)
      const e164 = toE164KR(phoneRaw)
      const emailTrim = signupEmail.trim().toLowerCase()

      if (!name.trim()) {
        setError('이름을 입력해주세요.')
        return
      }
      if (!birthDate) {
        setError('생년월일을 선택해주세요.')
        return
      }
      if (!isLikelyKRMobile(e164)) {
        setError('휴대폰 번호를 확인해주세요. (예: 01012345678)')
        return
      }
      if (!EMAIL_RE.test(emailTrim)) {
        setError('올바른 이메일 주소를 입력해주세요.')
        return
      }
      if (password2.length < 6) {
        setError('비밀번호는 6자 이상이에요.')
        return
      }
      if (password2 !== passwordConfirm) {
        setError('비밀번호가 서로 달라요.')
        return
      }

      setChecking(true)
      const { data: phoneOk, error: pErr } = await supabase.rpc('is_phone_available', {
        p_phone_e164: e164,
      })
      if (pErr) throw pErr
      if (!phoneOk) {
        setError('이미 가입된 휴대폰 번호예요. 로그인해주세요.')
        return
      }

      const { data: emailOk, error: eErr } = await supabase.rpc('is_signup_email_available', {
        p_email: emailTrim,
      })
      if (eErr) throw eErr
      if (!emailOk) {
        setError('이미 가입된 이메일이에요. 다른 이메일을 쓰거나 로그인해주세요.')
        return
      }

      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: emailTrim,
        options: {
          shouldCreateUser: true,
          // 이메일 OTP/매직링크 모두에서 리디렉션 URL이 필요한 경우가 있어 추가합니다.
          emailRedirectTo: window.location.origin,
        },
      })
      if (otpErr) throw otpErr

      setPendingEmail(emailTrim)
      setSignupPhase('email_otp')
      setInfo(`${emailTrim} 로 인증번호를 보냈어요. 메일함을 확인해주세요.`)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setChecking(false)
      setLoading(false)
    }
  }

  async function onVerifyEmailOtp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const code = otpCode.replace(/\D/g, '')
      if (code.length < 6) {
        setError('인증번호 6자리를 입력해주세요.')
        return
      }
      if (!pendingEmail) {
        setError('이메일 인증 정보가 없어요. 처음부터 다시 시도해주세요.')
        return
      }

      const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email',
      })
      if (vErr) throw vErr

      const uid = vData.user?.id
      if (!uid) throw new Error('NO_USER')

      const { error: pwErr } = await supabase.auth.updateUser({ password: password2 })
      if (pwErr) throw pwErr

      const birthDate = buildBirthDate(birthYear, birthMonth, birthDay)
      const e164 = toE164KR(phoneRaw)
      await saveProfileRow(uid, {
        displayName: name.trim(),
        birthDate,
        phone: e164,
      })

      navigate('/dashboard')
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function resendEmailOtp() {
    setError('')
    setInfo('')
    if (!pendingEmail) return
    setLoading(true)
    try {
      const { error: rErr } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      })
      if (rErr) throw rErr
      setInfo('인증번호를 다시 보냈어요.')
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-16 lg:py-14">
        <header className="border-b border-stone-200/90 pb-8">
          <StudioBrand to="/" variant="hero" />
          <p className="mt-2 text-sm text-stone-500">필라테스 스튜디오</p>
        </header>

        <section className="pt-10" aria-labelledby="auth-form-title">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-200/90 bg-white/95 p-6 shadow-xl shadow-stone-300/40 backdrop-blur-sm">
          <div className="mb-6">
            <h2 id="auth-form-title" className="text-xl font-semibold tracking-tight text-stone-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {mode === 'login'
                ? '휴대폰 번호와 비밀번호로 로그인하세요.'
                : signupPhase === 'email_otp'
                  ? '이메일로 받은 6자리를 입력하세요.'
                  : '이름 · 생년월일 · 휴대폰 · 이메일(인증) · 비밀번호'}
            </p>
          </div>

          {mode === 'login' ? (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-stone-600">휴대폰 번호</label>
                <input
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="01012345678"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-stone-600">비밀번호</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/30 hover:bg-pink-500 disabled:opacity-60"
              >
                {loading ? '처리 중...' : '로그인'}
              </button>
            </form>
          ) : signupPhase === 'form' ? (
            <form onSubmit={onSignupRequestOtp} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-stone-600">이름</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="실명"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-600">생년월일</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                  <select
                    value={String(Math.min(Number(birthDay) || 1, maxDay))}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  >
                    {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}일
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-600">휴대폰 번호</label>
                <p className="mb-2 text-xs text-stone-500">
                  로그인 ID로 사용됩니다. 가입 후 변경할 수 없어요(센터 문의).
                </p>
                <input
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  inputMode="numeric"
                  placeholder="01012345678"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-600">이메일 (인증용)</label>
                <p className="mb-2 text-xs text-stone-500">
                  가입 인증번호가 이 주소로 발송됩니다. Supabase에서 이메일 OTP를 켜세요.
                </p>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-600">비밀번호</label>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-stone-600">비밀번호 확인</label>
                <input
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {info}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || checking}
                className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/30 hover:bg-pink-500 disabled:opacity-60"
              >
                {loading || checking ? '처리 중...' : '이메일로 인증번호 받기'}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerifyEmailOtp} className="space-y-4">
              <p className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">{pendingEmail}</span> 로 보낸 코드를 입력하세요.
              </p>
              <div>
                <label className="mb-1 block text-sm text-stone-600">인증번호 6자리</label>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {info}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/30 hover:bg-pink-500 disabled:opacity-60"
              >
                {loading ? '확인 중...' : '인증하고 가입 완료'}
              </button>
              <button
                type="button"
                onClick={resendEmailOtp}
                disabled={loading}
                className="w-full rounded-xl border border-stone-200 bg-white py-3 text-sm text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-60"
              >
                인증번호 다시 받기
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-stone-200 pt-6">
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'login' ? 'signup' : 'login'))
                setError('')
                setInfo('')
                resetSignupForm()
                setPassword('')
                setLoginPhone('')
              }}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-3 text-center text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-100 hover:text-pink-800"
            >
              {mode === 'login'
                ? '계정이 없나요? 회원가입'
                : '이미 계정이 있나요? 로그인'}
            </button>
          </div>
        </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
            회원가입은 이메일로 받은 6자리 인증 후 비밀번호가 저장됩니다. Supabase 대시보드 → Authentication →
            Providers → Email에서 <strong className="text-stone-600">이메일 OTP(또는 Magic code)</strong>를
            사용하도록 설정해주세요.
          </p>
        </section>

        <section className="mt-12 border-t border-stone-200/90 pt-12" aria-label="센터 공지">
          <AnnouncementsSection />
        </section>
      </div>
    </div>
  )
}
