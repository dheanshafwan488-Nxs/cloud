interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  let colorStyle = 'bg-slate-100 text-slate-800 border-slate-300 font-semibold'

  switch (status?.toLowerCase()) {
    // Attendance
    case 'hadir':
      colorStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
      break
    case 'sakit':
      colorStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
      break
    case 'izin':
      colorStyle = 'bg-sky-50 text-sky-800 border-sky-300 font-semibold'
      break
    case 'alpa':
      colorStyle = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
      break

    // Complaint
    case 'pending':
      colorStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
      break
    case 'diproses':
      colorStyle = 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
      break
    case 'selesai':
      colorStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
      break

    // Enrollment & Account
    case 'aktif':
    case 'active':
      colorStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
      break
    case 'lulus':
      colorStyle = 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
      break
    case 'pindah':
    case 'nonaktif':
    case 'inactive':
      colorStyle = 'bg-slate-100 text-slate-700 border-slate-300 font-semibold'
      break

    // Roles
    case 'admin':
      colorStyle = 'bg-purple-50 text-purple-800 border-purple-300 font-semibold'
      break
    case 'guru_bk':
      colorStyle = 'bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold'
      break
    case 'wali_kelas':
      colorStyle = 'bg-teal-50 text-teal-800 border-teal-300 font-semibold'
      break
    case 'siswa':
      colorStyle = 'bg-slate-100 text-slate-800 border-slate-300 font-semibold'
      break

    default:
      colorStyle = 'bg-slate-100 text-slate-800 border-slate-300 font-semibold'
  }

  const sizeStyle = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs ${colorStyle} ${sizeStyle} ${className}`}
    >
      {status}
    </span>
  )
}
