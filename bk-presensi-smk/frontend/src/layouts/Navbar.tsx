import { Link } from 'react-router-dom'
import { Menu, LogOut, User as UserIcon, UserCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSchoolSettings } from '../hooks/useSchoolSettings'
import { StatusBadge } from '../components/common/StatusBadge'

interface NavbarProps {
  onToggleSidebar: () => void
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth()
  const { settings } = useSchoolSettings()

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          title="Buka Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs font-medium text-slate-400">
            {settings?.school_name || 'SMK IPTEK SANGGABUANA'}
          </span>
          <p className="text-sm font-semibold text-slate-800 -mt-0.5">Sistem BK & Presensi</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/profile"
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors group"
              title="Klik untuk mengedit profil akun Anda"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-navy-700 transition-colors">
                  {user.name}
                </p>
                <div className="mt-0.5">
                  <StatusBadge status={user.role} size="sm" />
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-navy-50 border border-navy-100 group-hover:border-navy-300 flex items-center justify-center text-navy-700 font-bold transition-all shadow-2xs">
                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
              </div>
            </Link>

            <button
              type="button"
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
