interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  let colorStyle = 'bg-slate-100 text-slate-700 border-slate-200'

  switch (status?.toLowerCase()) {
    // Attendance
    case 'hadir':
      colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      break
    case 'sakit':
      colorStyle = 'bg-amber-50 text-amber-700 border-amber-200'
      break
    case 'izin':
      colorStyle = 'bg-sky-50 text-sky-700 border-sky-200'
      break
    case 'alpa':
      colorStyle = 'bg-rose-50 text-rose-700 border-rose-200'
      break

    // Complaint
    case 'pending':
      colorStyle = 'bg-amber-50 text-amber-700 border-amber-200'
      break
    case 'diproses':
      colorStyle = 'bg-blue-50 text-blue-700 border-blue-200'
      break
    case 'selesai':
      colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      break

    // Enrollment & Account
    case 'aktif':
    case 'active':
      colorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      break
    case 'lulus':
      colorStyle = 'bg-blue-50 text-blue-700 border-blue-200'
      break
    case 'pindah':
    case 'nonaktif':
    case 'inactive':
      colorStyle = 'bg-slate-100 text-slate-600 border-slate-200'
      break

    // Roles
    case 'admin':
      colorStyle = 'bg-purple-50 text-purple-700 border-purple-200'
      break
    case 'guru_bk':
      colorStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200'
      break
    case 'wali_kelas':
      colorStyle = 'bg-teal-50 text-teal-700 border-teal-200'
      break
    case 'siswa':
      colorStyle = 'bg-slate-100 text-slate-700 border-slate-200'
      break

    default:
      colorStyle = 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colorStyle} ${sizeStyle} ${className}`}
    >
      {status}
    </span>
  )
}
