import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { HeartHandshake, Eye, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { complaintService } from '../../services/complaintService'
import { Complaint, ComplaintStatus } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { StatusBadge } from '../../components/common/StatusBadge'

export function CounselingPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('Diproses')

  const fetchCounselingCases = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await complaintService.getComplaints({
        status: (statusFilter as ComplaintStatus) || undefined,
      })
      if (resp.success && resp.data) {
        setComplaints(resp.data)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat daftar kasus konseling.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchCounselingCases()
  }, [fetchCounselingCases])

  const columns: Column<Complaint>[] = [
    {
      key: 'complaint_code',
      header: 'Kode Kasus',
      render: (row) => (
        <span className="font-mono font-bold text-navy-800">{row.complaint_code}</span>
      ),
    },
    {
      key: 'student',
      header: 'Siswa / Konseli',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">
            {row.student?.name || row.student_name}
          </span>
          <span className="block text-xs text-slate-400">
            {row.class?.name || row.class_name}
          </span>
        </div>
      ),
    },
    {
      key: 'incident_at',
      header: 'Tanggal Mulai',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {new Date(row.incident_at).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Penanganan',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Tindakan',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <Link
            to={`/complaints/${row.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Buka Lembar Bimbingan
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tindak Lanjut & Konseling Siswa"
        description="Monitoring penanganan kasus aktif, bimbingan individual, dan pemanggilan orang tua"
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FilterSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { label: 'Semua Status', value: '' },
              { label: 'Pending (Belum Ditangani)', value: 'Pending' },
              { label: 'Diproses (Sedang Bimbingan)', value: 'Diproses' },
              { label: 'Selesai (Kasus Tuntas)', value: 'Selesai' },
            ]}
            placeholder="Status Bimbingan"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={complaints}
        isLoading={isLoading}
        error={error}
        onRetry={fetchCounselingCases}
        emptyMessage="Tidak ada kasus yang sedang dalam penanganan konseling pada status ini."
      />
    </div>
  )
}
