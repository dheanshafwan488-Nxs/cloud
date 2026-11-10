import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, MessageSquareWarning, ShieldCheck } from 'lucide-react'
import { complaintService } from '../../services/complaintService'
import { classService } from '../../services/classService'
import { Complaint, SchoolClass, ComplaintStatus } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { SearchInput } from '../../components/tables/SearchInput'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'

export function ComplaintListPage() {
  const { user } = useAuth()
  const isSiswa = user?.role === 'siswa'

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [classFilter, setClassFilter] = useState<string>('')

  useEffect(() => {
    classService.getClasses().then((res) => {
      if (res.success && res.data) setClasses(res.data)
    })
  }, [])

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await complaintService.getComplaints({
        search: search || undefined,
        status: (statusFilter as ComplaintStatus) || undefined,
        class_id: classFilter ? Number(classFilter) : undefined,
      })
      if (resp.success && resp.data) {
        setComplaints(resp.data)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat daftar pengaduan.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, classFilter])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const columns: Column<Complaint>[] = [
    {
      key: 'complaint_code',
      header: 'Kode Kasus',
      render: (row) => (
        <div>
          <Link
            to={`/complaints/${row.id}`}
            className="font-mono font-bold text-navy-800 hover:text-navy-950 hover:underline"
          >
            {row.complaint_code}
          </Link>
          <span className="block text-[11px] text-slate-400">
            {new Date(row.incident_at).toLocaleDateString('id-ID')}
          </span>
        </div>
      ),
    },
    {
      key: 'student',
      header: 'Siswa & Kelas',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">
            {row.student?.name || row.student_name || `Siswa ID ${row.student_id}`}
          </span>
          <span className="block text-xs text-slate-500">
            {row.class?.name || row.class_name || 'Kelas Terdaftar'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Kasus',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'parent_visible',
      header: 'Wali Murid',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            row.parent_visible ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {row.parent_visible ? '🟢 Terbuka' : '🔒 Tertutup'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <Link
            to={`/complaints/${row.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:text-navy-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detail & Penanganan
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaduan & Kasus BK"
        description="Pusat pelaporan insiden, tindak disiplin, dan bimbingan konseling SMK IPTEK SANGGABUANA"
        action={
          <Link
            to="/complaints/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Pengaduan Baru
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari kode laporan / nama siswa..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { label: 'Pending', value: 'Pending' },
              { label: 'Diproses', value: 'Diproses' },
              { label: 'Selesai', value: 'Selesai' },
            ]}
            placeholder="Semua Status"
          />

          {!isSiswa && (
            <FilterSelect
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              placeholder="Semua Kelas"
            />
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={complaints}
        isLoading={isLoading}
        error={error}
        onRetry={fetchComplaints}
        emptyMessage="Belum ada pengaduan tercatat yang cocok dengan filter."
      />
    </div>
  )
}
