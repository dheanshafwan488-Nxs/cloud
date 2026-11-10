import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldAlert,
  MessageSquareWarning,
  HeartHandshake,
  BarChart3,
  UserCog,
  User as UserIcon,
  Settings,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSchoolSettings } from '../hooks/useSchoolSettings'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface MenuItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  roles: string[]
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'guru_bk', 'wali_kelas', 'siswa'],
  },
  {
    label: 'Data Siswa',
    href: '/students',
    icon: Users,
    roles: ['admin', 'guru_bk', 'wali_kelas'],
  },
  {
    label: 'Data Kelas',
    href: '/classes',
    icon: GraduationCap,
    roles: ['admin', 'guru_bk'],
  },
  {
    label: 'Presensi Siswa',
    href: '/attendance',
    icon: CalendarCheck,
    roles: ['admin', 'wali_kelas', 'guru_bk'],
  },
  {
    label: 'Pengaduan BK',
    href: '/complaints',
    icon: MessageSquareWarning,
    roles: ['admin', 'guru_bk', 'siswa'],
  },
  {
    label: 'Tindak Lanjut',
    href: '/counseling',
    icon: HeartHandshake,
    roles: ['admin', 'guru_bk'],
  },
  {
    label: 'Master Pelanggaran',
    href: '/violations',
    icon: ShieldAlert,
    roles: ['admin', 'guru_bk'],
  },
  {
    label: 'Laporan & Rekap',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin', 'guru_bk', 'wali_kelas'],
  },
  {
    label: 'Pengguna Sistem',
    href: '/users',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    label: 'Pengaturan Sekolah',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
  {
    label: 'Profil Saya',
    href: '/profile',
    icon: UserIcon,
    roles: ['admin', 'guru_bk', 'wali_kelas', 'siswa'],
  },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const { settings } = useSchoolSettings()

  const userRole = user?.role || 'siswa'
  const filteredMenu = MENU_ITEMS.filter((item) => item.roles.includes(userRole))

  const schoolName = settings?.school_name || 'SMK IPTEK SANGGABUANA'

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-navy-950 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-navy-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-navy-600 shrink-0 flex items-center justify-center font-bold text-white text-xs shadow-md">
              BK
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="font-bold text-xs text-white truncate" title={schoolName}>
                {schoolName}
              </h1>
              <p className="text-[10px] text-navy-400 font-mono tracking-wide">BK & PRESENSI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
            Menu Utama
          </div>
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(`${item.href}/`))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onClose()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-navy-800 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-navy-900/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-navy-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-navy-900 text-[11px] text-navy-400">
          <p className="font-medium text-slate-300 truncate" title={schoolName}>
            {schoolName}
          </p>
          <p>
            Tahun Ajaran {settings?.active_academic_year || '2026/2027'}
          </p>
        </div>
      </aside>
    </>
  )
}
