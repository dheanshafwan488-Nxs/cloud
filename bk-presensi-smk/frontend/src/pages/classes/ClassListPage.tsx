import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, GraduationCap, Eye, Edit2, ShieldCheck, X } from 'lucide-react'
import { classService, CreateClassPayload, AssignWaliPayload } from '../../services/classService'
import { userService } from '../../services/userService'
import { SchoolClass, AcademicYear, User } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { FormField } from '../../components/forms/FormField'
import { useAuth } from '../../hooks/useAuth'
import { showToast } from '../../hooks/useToast'

export function ClassListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'guru_bk'])

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  // Filters
  const [yearFilter, setYearFilter] = useState<string>('')
  const [gradeFilter, setGradeFilter] = useState<string>('')

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null)
  const [classNameInput, setClassNameInput] = useState('')
  const [gradeInput, setGradeInput] = useState<'X' | 'XI' | 'XII'>('X')
  const [yearInput, setYearInput] = useState<number | ''>('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningClass, setAssigningClass] = useState<SchoolClass | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch initial academic years & teachers
  useEffect(() => {
    classService.getAcademicYears().then((res) => {
      if (res.success && res.data) {
        setAcademicYears(res.data)
      }
    })
    userService.getUsers({ role: 'wali_kelas' }).then((res) => {
      if (res.success && res.data) {
        setTeachers(res.data)
      }
    })
  }, [])

  const fetchClasses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await classService.getClasses({
        academic_year_id: yearFilter ? Number(yearFilter) : undefined,
        grade_level: gradeFilter || undefined,
      })
      if (resp.success && resp.data) {
        setClasses(resp.data)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat data kelas.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [yearFilter, gradeFilter])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Open Create/Edit Class
  const handleOpenClassModal = (cls?: SchoolClass) => {
    if (cls) {
      setEditingClass(cls)
      setClassNameInput(cls.name)
      setGradeInput(cls.grade_level)
      setYearInput(cls.academic_year_id)
    } else {
      setEditingClass(null)
      setClassNameInput('')
      setGradeInput('X')
      setYearInput(academicYears[0]?.id || '')
    }
    setIsClassModalOpen(true)
  }

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classNameInput || !yearInput) {
      showToast('Harap lengkapi semua field.', 'warning')
      return
    }

    const payload: CreateClassPayload = {
      name: classNameInput,
      grade_level: gradeInput,
      academic_year_id: Number(yearInput),
    }

    setIsSubmitting(true)
    try {
      if (editingClass) {
        await classService.updateClass(editingClass.id, payload)
        showToast('Kelas berhasil diperbarui.', 'success')
      } else {
        await classService.createClass(payload)
        showToast('Kelas baru berhasil ditambahkan.', 'success')
      }
      setIsClassModalOpen(false)
      fetchClasses()
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan kelas.', 'error', err.request_id)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Assign Wali
  const handleOpenAssign = (cls: SchoolClass) => {
    setAssigningClass(cls)
    setSelectedTeacherId('')
    setIsAssignModalOpen(true)
  }

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningClass || !selectedTeacherId) return

    setIsSubmitting(true)
    try {
      const payload: AssignWaliPayload = {
        user_id: Number(selectedTeacherId),
        assignment_role: 'wali_kelas',
      }
      await classService.assignWali(assigningClass.id, payload)
      showToast(`Wali kelas berhasil ditugaskan untuk ${assigningClass.name}.`, 'success')
      setIsAssignModalOpen(false)
      fetchClasses()
    } catch (err: any) {
      showToast(err.message || 'Gagal menetapkan wali kelas.', 'error', err.request_id)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<SchoolClass>[] = [
    {
      key: 'name',
      header: 'Nama Kelas',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-xs">
            {row.grade_level}
          </div>
          <div>
            <Link
              to={`/classes/${row.id}`}
              className="font-bold text-navy-800 hover:text-navy-900 hover:underline"
            >
              {row.name}
            </Link>
            <span className="block text-[11px] text-slate-400">
              {row.academic_year?.label || 'Tahun Ajaran Aktif'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'grade_level',
      header: 'Tingkat',
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
          Tingkat {row.grade_level}
        </span>
      ),
    },
    {
      key: 'students_count',
      header: 'Total Siswa',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {row.students_count ?? 0} Siswa
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/classes/${row.id}`}
            className="p-1.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Lihat Anggota Kelas"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => handleOpenAssign(row)}
                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Tugaskan Wali Kelas"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleOpenClassModal(row)}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Edit Nama/Tingkat Kelas"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Kelas"
        description="Kelola rombongan belajar, tingkat kelas, dan penugasan wali kelas SMK IPTEK SANGGABUANA"
        action={
          canManage && (
            <button
              type="button"
              onClick={() => handleOpenClassModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Kelas
            </button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <FilterSelect
          value={yearFilter}
          onChange={(val) => setYearFilter(val)}
          options={academicYears.map((y) => ({ label: y.label, value: y.id }))}
          placeholder="Semua Tahun Ajaran"
        />

        <FilterSelect
          value={gradeFilter}
          onChange={(val) => setGradeFilter(val)}
          options={[
            { label: 'Tingkat X', value: 'X' },
            { label: 'Tingkat XI', value: 'XI' },
            { label: 'Tingkat XII', value: 'XII' },
          ]}
          placeholder="Semua Tingkat"
        />
      </div>

      <DataTable
        columns={columns}
        data={classes}
        isLoading={isLoading}
        error={error}
        onRetry={fetchClasses}
        emptyMessage="Belum ada kelas terdaftar untuk kriteria ini."
      />

      {/* Create / Edit Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900">
                {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <FormField label="Nama Kelas" required hint="Contoh: X RPL 1, XI TKJ 2">
                <input
                  type="text"
                  required
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="X RPL 1"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <FormField label="Tingkat Kelas" required>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                >
                  <option value="X">X (Sepuluh)</option>
                  <option value="XI">XI (Sebelas)</option>
                  <option value="XII">XII (Dua Belas)</option>
                </select>
              </FormField>

              <FormField label="Tahun Ajaran" required>
                <select
                  value={yearInput}
                  onChange={(e) => setYearInput(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.is_active ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Wali Kelas Modal */}
      {isAssignModalOpen && assigningClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900">
                Tugaskan Wali Kelas - {assigningClass.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="space-y-4">
              <FormField label="Pilih Guru / Wali Kelas" required>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                >
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTeacherId}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Tugaskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
