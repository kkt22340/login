import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import StudioBrand from './StudioBrand.jsx'
import { supabase } from './lib/supabaseClient'

const navBtn =
  'rounded-xl px-4 py-2 text-sm font-medium transition-colors border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50'
const navBtnActive =
  'rounded-xl px-4 py-2 text-sm font-medium transition-colors border border-pink-200 bg-pink-50 text-pink-800 shadow-sm ring-1 ring-pink-200'

export default function AdminLayout() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900 antialiased">
      <header className="border-b border-stone-200/90 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                관리자
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-stone-900">Studio</h1>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 self-end rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-50 hover:text-stone-900 sm:self-start"
            >
              로그아웃
            </button>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2 border-t border-stone-200/80 pt-6">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
            >
              회원 관리
            </NavLink>
            <NavLink
              to="/admin/classes"
              className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
            >
              수업 등록
            </NavLink>
            <NavLink
              to="/admin/reservations"
              className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
            >
              예약 현황
            </NavLink>
            <NavLink
              to="/admin/announcements"
              className={({ isActive }) => (isActive ? navBtnActive : navBtn)}
            >
              공지 관리
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
