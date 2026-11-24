import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, MessageSquareWarning, ShieldCheck, QrCode, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
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

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = complaints.length
    const pending = complaints.filter((c) => c.status === 'Pending').length
    const diproses = complaints.filter((c) => c.status === 'Diproses').length
    const selesai = complaints.filter((c) => c.status === 'Selesai').length
    return { total, pending, diproses, selesai }
  }, [complaints])

  const columns: Column<Complaint>[] = [
    {
      key: 'complaint_code',
      header: 'Kode Kasus',
      render: (row) => (
        <div>
          <Link
            to={`/complaints/${row.id}`}
            className="font-mono font-bold text-navy-900 hover:text-navy-700 hover:underline text-sm"
          >
            {row.complaint_code}
          </Link>
          <span className="block text-xs font-semibold text-slate-500 mt-0.5">
            {new Date(row.incident_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'student',
      header: 'Siswa, NIS & Kelas',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-sm">
            {row.student?.name || row.student_name || `Siswa ID ${row.student_id}`}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {(row.student?.nis || row.student_nis) && (
              <span className="inline-block font-mono text-[11px] font-bold text-navy-900 bg-navy-50 border border-navy-200 px-1.5 py-0.5 rounded">
                NIS: {row.student?.nis || row.student_nis}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-600">
              {row.class?.name || row.class_name || 'Kelas Terdaftar'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'violation',
      header: 'Jenis Pelanggaran & Poin',
      render: (row) => {
        const items = row.violation_items && row.violation_items.length > 0
          ? row.violation_items
          : row.violations && row.violations.length > 0
          ? row.violations.map((v) => ({ id: v.id, name: v.name, points: v.points }))
          : row.manual_violation
          ? [{ id: null, name: row.manual_violation, points: row.total_points || 10 }]
          : []

        const totalPoints = typeof row.total_points === 'number'
          ? row.total_points
          : items.reduce((s, it) => s + Number(it.points || 0), 0)

        return (
          <div className="max-w-xs space-y-1.5">
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1 items-center">
                {items.map((v, i) => (
                  <span
                    key={`${v.id ?? 'm'}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200"
                  >
                    <span>{v.name}</span>
                    <span className="font-mono text-[11px] font-bold text-rose-700">+{v.points}p</span>
                  </span>
                ))}
                {totalPoints > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-600 text-white">
                    Total +{totalPoints} Poin
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">-</span>
            )}
            <span className="block text-xs text-slate-700 font-medium">
              Pelapor (Khusus BK): <strong className="text-slate-900">{row.reporter_name || 'Siswa Terdaftar'}</strong>
            </span>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status Kasus',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'parent_visible',
      header: 'Wali Murid',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold ${
            row.parent_visible ? 'text-emerald-800' : 'text-slate-600'
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-navy-900 hover:text-navy-950 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-navy-700" />
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
        description="Pusat pelaporan insiden, penegakan kedisiplinan, dan layanan bimbingan konseling SMK IPTEK SANGGABUANA"
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/pengaduan-siswa"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Link Form Siswa (Barcode)</span>
            </Link>
            <Link
              to="/complaints/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Kasus Baru
            </Link>
          </div>
        }
      />

      {/* Summary Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kasus</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Menunggu (Pending)</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Sedang Diproses</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{metrics.diproses}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Kasus Tuntas</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.selesai}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Cari kode laporan / nama siswa / NIS..."
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={complaints}
          isLoading={isLoading}
          error={error}
          onRetry={fetchComplaints}
          emptyMessage="Belum ada laporan pengaduan yang sesuai filter."
        />
      </div>
    </div>
  )
}
