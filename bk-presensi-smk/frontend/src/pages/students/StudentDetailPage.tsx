import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Calendar, BookOpen, AlertCircle, Clock, Send, QrCode } from 'lucide-react'
import { studentService } from '../../services/studentService'
import { attendanceService } from '../../services/attendanceService'
import { Student, Attendance } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton'
import { ErrorState } from '../../components/common/ErrorState'
import { ParentAccessCardModal } from '../../components/common/ParentAccessCardModal'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)
  const [isParentModalOpen, setIsParentModalOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)

    Promise.all([
      studentService.getStudent(id),
      attendanceService.getAttendances({ student_id: Number(id), per_page: 10 }),
    ])
      .then(([stdRes, attRes]) => {
        if (stdRes.success && stdRes.data) {
          setStudent(stdRes.data)
        }
        if (attRes.success && attRes.data) {
          setAttendances(attRes.data)
        }
      })
      .catch((err: any) => {
        setError({
          message: err.message || 'Gagal mengambil informasi siswa.',
          requestId: err.request_id,
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Detail Siswa" description="Memuat informasi profil..." />
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <LoadingSkeleton rows={4} />
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Detail Siswa" />
        <ErrorState
          title="Data Tidak Ditemukan"
          message={error?.message || 'Data siswa tidak ditemukan di sistem.'}
          requestId={error?.requestId}
        />
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Siswa
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Link>
      </div>

      <PageHeader
        title={student.name}
        description={`Profil Siswa SMK IPTEK SANGGABUANA - NIS: ${student.nis}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsParentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Akses Telegram Wali
            </button>
            <StatusBadge status={student.enrollment_status} size="md" />
          </div>
        }
      />

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card + Telegram Card */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{student.name}</h3>
                <p className="text-xs text-slate-500 font-mono">NIS: {student.nis}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">NISN</span>
                <span className="font-mono text-slate-800">{student.nisn || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis Kelamin</span>
                <span className="text-slate-800">
                  {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Lahir</span>
                <span className="text-slate-800">{student.birth_date || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kelas Aktif</span>
                <span className="font-semibold text-navy-700">
                  {student.class?.name || `Kelas ID ${student.class_id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tingkat</span>
                <span className="text-slate-800">{student.class?.grade_level || '-'}</span>
              </div>
            </div>
          </div>

          {/* Telegram Access Quick Card */}
          <div className="bg-sky-50/50 p-5 rounded-xl border border-sky-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-600" />
                Integrasi Telegram Wali
              </span>
              <span className="text-[10px] bg-white border border-sky-200 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                Auto-Alert
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Orang tua dapat memantau presensi dan pengaduan BK secara otomatis melalui bot Telegram resmi sekolah.
            </p>
            <button
              onClick={() => setIsParentModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-sky-100/60 border border-sky-300 text-sky-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              Buka QR & Kode Akses Wali
            </button>
          </div>
        </div>

        {/* Recent Attendance History */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-navy-600" />
              10 Catatan Presensi Terkini
            </h3>
            <Link to="/attendance" className="text-xs font-semibold text-navy-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {attendances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono">{att.date}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={att.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{att.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs py-8">
              Belum ada data presensi tercatat untuk siswa ini.
            </div>
          )}
        </div>
      </div>

      {/* Parent Access Telegram Modal */}
      {student && (
        <ParentAccessCardModal
          isOpen={isParentModalOpen}
          onClose={() => setIsParentModalOpen(false)}
          studentId={student.id}
          studentName={student.name}
        />
      )}
    </div>
  )
}
