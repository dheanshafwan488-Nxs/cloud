import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  Activity,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Flame,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { dashboardService, AttendanceChartPoint, RecentActivity } from '../../services/dashboardService'
import { DashboardSummary } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { CardSkeleton } from '../../components/common/LoadingSkeleton'
import { ErrorState } from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<AttendanceChartPoint[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)
  const [chartDays, setChartDays] = useState<number>(7)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [sumRes, chartRes, actRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getAttendanceChart({ days: chartDays }),
        dashboardService.getRecentActivities(),
      ])

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data)
      }
      if (chartRes.success && chartRes.data) {
        setChartData(chartRes.data)
      }
      if (actRes.success && actRes.data) {
        setActivities(actRes.data)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat data dashboard.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [chartDays])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ringkasan sistem dan aktivitas sekolah" />
        <ErrorState
          title="Kendala Memuat Dashboard"
          message={error.message}
          requestId={error.requestId}
          onRetry={fetchData}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat Datang, ${user?.name || 'Pengguna'}`}
        description={`Panel Pemantauan Bimbingan Konseling & Presensi Siswa SMK IPTEK SANGGABUANA`}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Siswa Aktif */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Siswa Aktif
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.total_students ?? 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Terdaftar di sistem</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Kelas Aktif */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Kelas
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {summary?.total_classes ?? 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Tingkat X, XI, XII</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Kehadiran Hari Ini */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hadir Hari Ini
                </p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  {summary?.attendance_today?.hadir ?? 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  S: {summary?.attendance_today?.sakit ?? 0} | I: {summary?.attendance_today?.izin ?? 0} | A: {summary?.attendance_today?.alpa ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Pengaduan Aktif */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pengaduan BK
                </p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">
                  {summary?.complaints?.pending ?? 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proses: {summary?.complaints?.diproses ?? 0} | Selesai: {summary?.complaints?.selesai ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Early Warning System & Tindakan Mendesak */}
      {summary?.early_warnings && (
        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 px-5 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-wide flex items-center gap-2">
                  Early Warning System & Tindakan Mendesak
                  {summary.early_warnings.total_alerts > 0 && (
                    <span className="px-2 py-0.5 bg-white text-rose-700 text-xs font-black rounded-full">
                      {summary.early_warnings.total_alerts} Perhatian
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-white/80">
                  Deteksi otomatis siswa dengan akumulasi alpa tinggi, poin kritis, atau pengaduan tertunda.
                </p>
              </div>
            </div>
            <Link
              to="/complaints"
              className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              Kelola Kasus <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Siswa Kritis Presensi */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Kritis Presensi (Alpa &ge; 3)
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                    {summary.early_warnings.critical_attendance?.length || 0} Siswa
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {summary.early_warnings.critical_attendance && summary.early_warnings.critical_attendance.length > 0 ? (
                    summary.early_warnings.critical_attendance.map((s) => (
                      <div key={s.id} className="p-2.5 bg-white rounded-lg border border-rose-100 shadow-2xs flex items-center justify-between text-xs">
                        <div>
                          <Link to={`/students/${s.id}`} className="font-semibold text-slate-900 hover:text-navy-700 block">
                            {s.name}
                          </Link>
                          <span className="text-[10px] text-slate-500 font-mono">{s.nis} • {s.class_name}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-full border border-rose-200">
                          {s.alpa_count}x Alpa
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">Tidak ada siswa alpa berturut-turut.</p>
                  )}
                </div>
              </div>

              <Link
                to="/attendance"
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center justify-between pt-2 border-t border-rose-100"
              >
                <span>Lihat Rekap Presensi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 2. Akumulasi Poin Pelanggaran Tinggi */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    Poin Pelanggaran Kritis
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    {summary.early_warnings.critical_violations?.length || 0} Siswa
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {summary.early_warnings.critical_violations && summary.early_warnings.critical_violations.length > 0 ? (
                    summary.early_warnings.critical_violations.map((s) => (
                      <div key={s.id} className="p-2.5 bg-white rounded-lg border border-amber-100 shadow-2xs flex items-center justify-between text-xs">
                        <div>
                          <Link to={`/students/${s.id}`} className="font-semibold text-slate-900 hover:text-navy-700 block">
                            {s.name}
                          </Link>
                          <span className="text-[10px] text-amber-700 font-medium">{s.sanction_tier}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-black text-[11px] rounded-lg">
                          {s.total_points} Poin
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">Belum ada siswa melebihi ambang batas poin.</p>
                  )}
                </div>
              </div>

              <Link
                to="/violations"
                className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center justify-between pt-2 border-t border-amber-100"
              >
                <span>Daftar Pelanggaran & Poin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3. Kasus BK Menunggu Tindak Lanjut */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Pengaduan BK Perlu Respon
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                    {summary.early_warnings.urgent_complaints?.length || 0} Kasus
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {summary.early_warnings.urgent_complaints && summary.early_warnings.urgent_complaints.length > 0 ? (
                    summary.early_warnings.urgent_complaints.map((c) => (
                      <div key={c.id} className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs flex items-center justify-between text-xs">
                        <div>
                          <Link to={`/complaints/${c.id}`} className="font-semibold text-slate-900 hover:text-navy-700 block">
                            #{c.complaint_code} • {c.student_name}
                          </Link>
                          <span className="text-[10px] text-slate-400 line-clamp-1">{c.chronology}</span>
                        </div>
                        <Link
                          to={`/complaints/${c.id}`}
                          className="px-2 py-1 bg-navy-700 hover:bg-navy-800 text-white font-semibold text-[10px] rounded-md transition-colors"
                        >
                          Tindak
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">Seluruh laporan pending tertangani.</p>
                  )}
                </div>
              </div>

              <Link
                to="/complaints"
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center justify-between pt-2 border-t border-indigo-100"
              >
                <span>Buka Panel Bimbingan Konseling</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Grafik Rekapitulasi Presensi</h2>
              <p className="text-xs text-slate-500">Tren kehadiran siswa harian</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={chartDays}
                onChange={(e) => setChartDays(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value={7}>7 Hari Terakhir</option>
                <option value={14}>14 Hari Terakhir</option>
                <option value={30}>30 Hari Terakhir</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="hadir" name="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sakit" name="Sakit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="izin" name="Izin" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alpa" name="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Belum ada data presensi pada rentang ini.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-navy-600" />
              Aktivitas Terkini
            </h2>
            <span className="text-xs text-slate-400">Audit Log</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-72 pr-1">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{act.user_name || 'Sistem'}</span>
                    <span className="text-[10px] text-slate-400">{act.created_at}</span>
                  </div>
                  <p className="text-slate-600">
                    <span className="font-mono text-navy-700 font-medium">[{act.action}]</span>{' '}
                    pada entitas <span className="font-medium text-slate-700">{act.entity_type}</span>
                  </p>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center py-8">
                Belum ada catatan aktivitas baru.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
