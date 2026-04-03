/** Supabase RPC `book_class` / Postgres RAISE 메시지 → 사용자용 문구 */
export function friendlyBookError(err) {
  const msg = String(err?.message ?? err ?? '')
  const details = String(err?.details ?? '')

  if (/NO_CREDITS/i.test(msg) || /NO_CREDITS/i.test(details)) {
    return '수강권이 없습니다'
  }
  if (/ALREADY_BOOKED/i.test(msg) || /duplicate key|unique constraint/i.test(msg)) {
    return '이미 예약한 수업이에요.'
  }
  if (/CLASS_FULL/i.test(msg)) {
    return '정원이 찼어요. 다른 시간을 선택해주세요.'
  }
  if (/CLASS_STARTED/i.test(msg)) {
    return '이미 시작했거나 지난 수업이에요.'
  }
  if (/CLASS_NOT_FOUND/i.test(msg)) {
    return '수업을 찾을 수 없어요.'
  }
  if (/NOT_AUTHENTICATED/i.test(msg)) {
    return '로그인이 필요해요.'
  }
  if (/NO_PROFILE/i.test(msg)) {
    return '프로필 정보가 없어요. 잠시 후 다시 시도해주세요.'
  }
  return msg || '예약 처리 중 문제가 발생했어요.'
}

/** Supabase RPC `cancel_booking` */
export function friendlyCancelError(err) {
  const msg = String(err?.message ?? err ?? '')
  const details = String(err?.details ?? '')

  if (/TOO_LATE_TO_CANCEL/i.test(msg) || /TOO_LATE_TO_CANCEL/i.test(details)) {
    return '수업 시작 24시간 전이 지나 취소할 수 없어요.'
  }
  if (/ALREADY_CANCELLED/i.test(msg)) {
    return '이미 취소된 예약이에요.'
  }
  if (/NOT_YOUR_RESERVATION/i.test(msg)) {
    return '본인 예약만 취소할 수 있어요.'
  }
  if (/RESERVATION_NOT_FOUND/i.test(msg)) {
    return '예약을 찾을 수 없어요.'
  }
  if (/NOT_AUTHENTICATED/i.test(msg)) {
    return '로그인이 필요해요.'
  }
  if (/CANNOT_CANCEL_STATUS/i.test(msg)) {
    return '이 상태에서는 취소할 수 없어요.'
  }
  if (/CLASS_NOT_FOUND/i.test(msg)) {
    return '수업 정보를 찾을 수 없어요.'
  }
  return msg || '취소 처리 중 문제가 발생했어요.'
}
