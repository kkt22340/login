export function friendlyAdminDbError(err) {
  const msg = String(err?.message ?? err ?? '')
  const code = err?.code

  if (/permission denied|row-level security|RLS/i.test(msg) || code === '42501') {
    return '권한이 없어요. Supabase RLS(005 스크립트 등)와 관리자(is_admin) 설정을 확인해주세요.'
  }
  if (/violates foreign key|foreign key constraint/i.test(msg) || code === '23503') {
    return '이 수업에 남아 있는 예약이 있어 삭제할 수 없어요. 예약을 취소·정리한 뒤 다시 시도해주세요.'
  }
  if (/duplicate key|already exists/i.test(msg) || code === '23505') {
    return '이미 같은 정보가 있어요.'
  }
  return msg || '처리 중 문제가 발생했어요.'
}
