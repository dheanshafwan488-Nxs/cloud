import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, Eye, Edit2, Trash2, Send } from 'lucide-react'
import { studentService } from '../../services/studentService'
import { classService } from '../../services/classService'
import { Student, SchoolClass, PaginationMeta } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { SearchInput } from '../../components/tables/SearchInput'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { StatusBadge } from '../../components/common/StatusBadge'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { StudentFormModal } from './StudentFormModal'
import { StudentImportModal } from './StudentImportModal'
import { ParentAccessCardModal } from '../../components/common/ParentAccessCardModal'
import { useAuth } from '../../hooks/useAuth'
import { showToast } from '../../hooks/useToast'

export function StudentListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'guru_bk'])
  const [telegramStudent, setTelegramStudent] = useState<Student | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load Classes for filter dropdown
  useEffect(() => {
    classService.getClasses().then((res) => {
      if (res.success && res.data) {
        setClasses(res.data)
      }
    })
  }, [])

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await studentService.getStudents({
        search: search || undefined,
        class_id: classFilter ? Number(classFilter) : undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      })
      if (resp.success) {
        setStudents(resp.data || [])
        setPagination(resp.meta || null)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat data siswa.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [search, classFilter, statusFilter, page])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Handle Delete
  const handleDelete = async () => {
    if (!deletingStudent) return
    setIsDeleting(true)
    try {
      await studentService.deleteStudent(deletingStudent.id)
      showToast(`Data siswa ${deletingStudent.name} berhasil dihapus/diarsipkan.`, 'success')
      setDeletingStudent(null)
      fetchStudents()
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus siswa.', 'error', err.request_id)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<Student>[] = [
    {
      key: 'nis',
      header: 'NIS / NISN',
      render: (row) => (
        <div>
          <span className="font-mono font-medium text-slate-900">{row.nis}</span>
          {row.nisn && <span className="block text-xs text-slate-400">NISN: {row.nisn}</span>}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nama Siswa',
      render: (row) => (
        <div>
          <Link
            to={`/students/${row.id}`}
            className="font-medium text-navy-700 hover:text-navy-900 hover:underline"
          >
            {row.name}
          </Link>
          <span className="block text-xs text-slate-400">
            {row.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
          </span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Kelas',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          {row.class?.name || `Kelas ID ${row.class_id}`}
        </span>
      ),
    },
    {
      key: 'enrollment_status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.enrollment_status} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/students/${row.id}`}
            className="p-1.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Lihat Detail Siswa"
          >
            <Eye className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => setTelegramStudent(row)}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Kartu Akses Telegram Wali Murid"
          >
            <Send className="w-4 h-4" />
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(row)
                  setIsFormOpen(true)
                }}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Edit Siswa"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingStudent(row)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Hapus / Arsipkan Siswa"
              >
                <Trash2 className="w-4 h-4" />
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
        title="Data Siswa"
        description="Kelola profil siswa, NIS, kelas, dan status kelulusan SMK IPTEK SANGGABUANA"
        action={
          canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Impor CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null)
                  setIsFormOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Siswa
              </button>
            </div>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Cari nama atau NIS siswa..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={classFilter}
            onChange={(val) => {
              setClassFilter(val)
              setPage(1)
            }}
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Semua Kelas"
          />

          <FilterSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
            options={[
              { label: 'Aktif', value: 'aktif' },
              { label: 'Lulus', value: 'lulus' },
              { label: 'Pindah', value: 'pindah' },
              { label: 'Nonaktif', value: 'nonaktif' },
            ]}
            placeholder="Semua Status"
          />
        </div>
      </div>

      {/* Main Students Table */}
      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        error={error}
        onRetry={fetchStudents}
        paginationMeta={pagination}
        onPageChange={(p) => setPage(p)}
        emptyMessage="Tidak ada data siswa yang cocok dengan filter."
      />

      {/* Form Modal for Add / Edit */}
      <StudentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchStudents}
        student={editingStudent}
        classes={classes}
      />

      {/* CSV Import Modal */}
      <StudentImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchStudents}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingStudent}
        title="Konfirmasi Penghapusan Siswa"
        message={`Apakah Anda yakin ingin menghapus atau menonaktifkan siswa "${deletingStudent?.name}" (NIS: ${deletingStudent?.nis})? Histori akademik akan tetap terjaga.`}
        confirmLabel="Hapus Siswa"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingStudent(null)}
      />

      {/* Parent Access Telegram Modal */}
      {telegramStudent && (
        <ParentAccessCardModal
          isOpen={!!telegramStudent}
          onClose={() => setTelegramStudent(null)}
          studentId={telegramStudent.id}
          studentName={telegramStudent.name}
        />
      )}
    </div>
  )
}
