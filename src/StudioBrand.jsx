import { Link } from 'react-router-dom'

const variants = {
  /** 로그인·대시보드 메인 타이틀 */
  hero: 'text-4xl font-bold tracking-tight sm:text-5xl',
  /** 서브 페이지 상단 로고 줄 */
  nav: 'text-xl font-bold tracking-tight sm:text-2xl',
  /** 관리자 헤더 등 보조 크기 */
  compact: 'text-lg font-semibold tracking-tight',
}

/**
 * @param {{ to?: string; variant?: 'hero' | 'nav' | 'compact'; className?: string }} [props]
 */
export default function StudioBrand({
  to = '/dashboard',
  variant = 'nav',
  className = '',
}) {
  const v = variants[variant] ?? variants.nav
  return (
    <Link
      to={to}
      className={`inline-block text-stone-900 transition hover:text-pink-700 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 ${v} ${className}`}
      aria-label="Studio 홈으로 이동"
    >
      Studio
    </Link>
  )
}
