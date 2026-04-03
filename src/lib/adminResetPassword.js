import { supabase } from './supabaseClient'

/**
 * 관리자가 다른 회원의 비밀번호를 초기화합니다.
 * Supabase Edge Function `admin-reset-password` 배포 및 `SUPABASE_SERVICE_ROLE_KEY` 시크릿 필요.
 */
export async function adminResetUserPassword(targetUserId, newPassword) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL 이 없어요.')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('로그인이 필요해요.')
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/admin-reset-password`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetUserId, newPassword }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload?.error || `비밀번호 초기화 실패 (${res.status})`)
  }
  return payload
}
