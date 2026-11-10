import { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { classService } from '../../services/classService'
import { reportService, AttendanceReportSummary, ComplaintReportSummary } from '../../services/reportService'
import { SchoolClass } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton'
import { ErrorState } from '../../components/common/ErrorState'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'complaints'>('attendance')
  const [classes, setClasses] = useState<SchoolClass[]>([])

  // Attendance Filters
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  // Report Data
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportSummary | null>(null)
  const [complaintReport, setComplaintReport] = useState<ComplaintReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  useEffect(() => {
    classService.getClasses().then((res) => {
      if (res.success && res.data) setClasses(res.data)
    })
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    if (activeTab === 'attendance') {
      reportService
        .getAttendanceReport({
          date_from: dateFrom,
          date_to: dateTo,
          class_id: selectedClassId ? Number(selectedClassId) : undefined,
        })
        .then((res) => {
          if (res.success && res.data) setAttendanceReport(res.data)
        })
        .catch((err: any) => {
          setError({ message: err.message, requestId: err.request_id })
        })
        .finally(() => setIsLoading(false))
    } else {
      reportService
        .getComplaintReport({ date_from: dateFrom, date_to: dateTo })
        .then((res) => {
          if (res.success && res.data) setComplaintReport(res.data)
        })
        .catch((err: any) => {
          setError({ message: err.message, requestId: err.request_id })
        })
        .finally(() => setIsLoading(false))
    }
  }, [activeTab, dateFrom, dateTo, selectedClassId])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekapitulasi"
        description="Analisis statistik presensi, kedisiplinan, dan kasus bimbingan konseling SMK IPTEK SANGGABUANA"
        action={
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Cetak Laporan
            </button>
            <a
              href={reportService.getExportUrl(activeTab, 'csv', {
                date_from: dateFrom,
                date_to: dateTo,
                class_id: selectedClassId,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh CSV
            </a>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-navy-600 text-navy-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekapitulasi Presensi Siswa
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('complaints')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'complaints'
              ? 'border-navy-600 text-navy-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekapitulasi Kasus & Pelanggaran BK
        </button>
      </div>

      {/* Filter Period Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Dari:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Sampai:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
            />
          </div>

          {activeTab === 'attendance' && (
            <div className="w-48">
              <FilterSelect
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                options={classes.map((c) => ({ label: c.name, value: c.id }))}
                placeholder="Semua Kelas"
              />
            </div>
          )}
        </div>
      </div>

      {/* Attendance Report Content */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Formula Academic Documentation Alert */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Standar Rumus Perhitungan Kehadiran Fisik:</p>
              <p className="mt-0.5">
                Persentase Kehadiran = (Jumlah Hari Hadir / Total Hari Sekolah yang Difinalisasi) × 100%. Hari libur kalender tidak dihitung sebagai ketidakhadiran.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <LoadingSkeleton rows={5} />
            </div>
          ) : attendanceReport ? (
            <div className="space-y-6">
              {/* Overall KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
                  <span className="text-xs text-slate-400">Total Kehadiran</span>
                  <p className="text-2xl font-bold text-navy-800 mt-1">
                    {attendanceReport.attendance_percentage}%
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs text-emerald-700 font-medium">Hadir</span>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {attendanceReport.total_present}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <span className="text-xs text-amber-700 font-medium">Sakit</span>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {attendanceReport.total_sick}
                  </p>
                </div>
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center">
                  <span className="text-xs text-sky-700 font-medium">Izin</span>
                  <p className="text-2xl font-bold text-sky-800 mt-1">
                    {attendanceReport.total_permission}
                  </p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
                  <span className="text-xs text-rose-700 font-medium">Alpa</span>
                  <p className="text-2xl font-bold text-rose-800 mt-1">
                    {attendanceReport.total_absent}
                  </p>
                </div>
              </div>

              {/* Breakdown by Class Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Rekapitulasi Kehadiran per Rombel Kelas
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-semibold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Nama Kelas</th>
                        <th className="py-3 px-4">Jumlah Siswa</th>
                        <th className="py-3 px-4 text-emerald-700">Hadir</th>
                        <th className="py-3 px-4 text-amber-700">Sakit</th>
                        <th className="py-3 px-4 text-sky-700">Izin</th>
                        <th className="py-3 px-4 text-rose-700">Alpa</th>
                        <th className="py-3 px-4 text-right font-bold text-slate-800">
                          Persentase
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceReport.by_class?.map((c) => (
                        <tr key={c.class_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-800">{c.class_name}</td>
                          <td className="py-3 px-4">{c.total_students}</td>
                          <td className="py-3 px-4 font-medium text-emerald-700">{c.hadir}</td>
                          <td className="py-3 px-4 font-medium text-amber-700">{c.sakit}</td>
                          <td className="py-3 px-4 font-medium text-sky-700">{c.izin}</td>
                          <td className="py-3 px-4 font-medium text-rose-700">{c.alpa}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-navy-800">
                            {c.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
              Tidak ada data rekap presensi untuk periode ini.
            </div>
          )}
        </div>
      )}

      {/* Complaints Report Content */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <LoadingSkeleton rows={5} />
            </div>
          ) : complaintReport ? (
            <div className="space-y-6">
              {/* Complaints KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
                  <span className="text-xs text-slate-400">Total Laporan</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {complaintReport.total_complaints}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <span className="text-xs text-amber-700 font-medium">Pending</span>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {complaintReport.pending}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                  <span className="text-xs text-blue-700 font-medium">Diproses</span>
                  <p className="text-2xl font-bold text-blue-800 mt-1">
                    {complaintReport.diproses}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs text-emerald-700 font-medium">Selesai</span>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {complaintReport.selesai}
                  </p>
                </div>
              </div>

              {/* By Violation Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Distribusi Pelanggaran Terbanyak
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-semibold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Jenis Pelanggaran</th>
                        <th className="py-3 px-4">Jumlah Kejadian</th>
                        <th className="py-3 px-4 text-right">Akumulasi Poin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complaintReport.by_violation?.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800">{v.violation_name}</td>
                          <td className="py-3 px-4">{v.total_cases} Kasus</td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            +{v.total_points} Poin
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
              Tidak ada data laporan kasus pada periode ini.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
