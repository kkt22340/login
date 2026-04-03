import { createClient } from '@supabase/supabase-js'

// 1. 환경 변수 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. 디버깅용 로그 (브라우저 F12 콘솔에서 확인 가능)
console.log('--- Supabase 연결 체크 ---')
console.log('URL 존재 여부:', !!supabaseUrl)
console.log('Key 존재 여부:', !!supabaseAnonKey)

// 3. 만약 값이 없다면 경고창 띄우기 (실제 에러 방지)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '🚨 에러: .env 파일에서 정보를 읽어오지 못했습니다!\n' +
    '1. .env 파일이 프로젝트 최상단(package.json 옆)에 있는지 확인하세요.\n' +
    '2. 변수명이 VITE_SUPABASE_URL 로 시작하는지 확인하세요.'
  )
}

// 4. 클라이언트 생성 및 내보내기
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)