import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, CalendarCheck, GraduationCap, Eye } from 'lucide-react'
import { classService } from '../../services/classService'
import { SchoolClass, Student } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton'
import { ErrorState } from '../../components/common/ErrorState'

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)

    Promise.all([classService.getClass(id), classService.getClassStudents(id)])
      .then(([classRes, stdRes]) => {
        if (classRes.success && classRes.data) {
          setSchoolClass(classRes.data)
        }
        if (stdRes.success && stdRes.data) {
          setStudents(stdRes.data)
        }
      })
      .catch((err: any) => {
        setError({
          message: err.message || 'Gagal memuat detail kelas.',
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
        <PageHeader title="Detail Kelas" description="Memuat informasi rombel..." />
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <LoadingSkeleton rows={4} />
        </div>
      </div>
    )
  }

  if (error || !schoolClass) {
    return (
      <div className="space-y-6">
        <PageHeader title="Detail Kelas" />
        <ErrorState
          title="Kelas Tidak Ditemukan"
          message={error?.message || 'Data kelas tidak ditemukan di sistem.'}
          requestId={error?.requestId}
        />
        <Link
          to="/classes"
          className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Data Kelas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/classes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Link>
      </div>

      <PageHeader
        title={`Kelas ${schoolClass.name}`}
        description={`Tingkat ${schoolClass.grade_level} - ${schoolClass.academic_year?.label || 'Tahun Ajaran Aktif'}`}
        action={
          <Link
            to={`/attendance?class_id=${schoolClass.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
          >
            <CalendarCheck className="w-4 h-4" />
            Input Presensi Kelas
          </Link>
        }
      />

      {/* Class Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Siswa Terdaftar
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{students.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tingkat Pembelajaran
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              Kelas {schoolClass.grade_level}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status Kelas
            </p>
            <h3 className="text-lg font-bold text-emerald-600 mt-1">Aktif Berjalan</h3>
          </div>
          <StatusBadge status="aktif" size="md" />
        </div>
      </div>

      {/* Students List in this Class */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Daftar Anggota Siswa ({students.length})
          </h3>
        </div>

        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">L/P</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{std.nis}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{std.name}</td>
                    <td className="py-3 px-4 text-xs">{std.gender || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={std.enrollment_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/students/${std.id}`}
                        className="inline-flex items-center gap-1 text-xs text-navy-700 hover:text-navy-900 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            Belum ada siswa yang dimasukkan ke dalam kelas ini.
          </div>
        )}
      </div>
    </div>
  )
}
