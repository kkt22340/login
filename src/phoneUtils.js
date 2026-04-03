/** 한국 휴대폰 번호를 E.164(+82...)로 변환 */
export function toE164KR(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('82')) return `+${digits}`
  if (digits.startsWith('0')) return `+82${digits.slice(1)}`
  if (digits.length >= 9 && digits.length <= 11) return `+82${digits}`
  return ''
}

export function isLikelyKRMobile(e164) {
  if (!e164 || !e164.startsWith('+82')) return false
  const rest = e164.slice(3)
  return rest.length >= 9 && rest.length <= 10
}

/** 프로토타입(SMS 생략): auth 가입에 쓰는 합성 이메일 — 전화 E.164와 1:1 */
export function protoLoginEmailFromE164(e164) {
  const digits = String(e164 ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return `${digits}@sms.proto`
}
