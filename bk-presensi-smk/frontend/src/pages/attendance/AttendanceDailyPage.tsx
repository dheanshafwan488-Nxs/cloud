import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  Save,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  CheckCheck,
  Table,
  LayoutGrid,
  Smartphone,
} from 'lucide-react'
import { classService } from '../../services/classService'
import { attendanceService, BulkAttendanceItem } from '../../services/attendanceService'
import { SchoolClass, Student, AttendanceStatus } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { showToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

export function AttendanceDailyPage() {
  const [searchParams] = useSearchParams()
  const initialClassId = searchParams.get('class_id') || ''
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto')

  const { hasRole } = useAuth()
  const canFinalize = hasRole(['admin', 'wali_kelas'])

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceMap, setAttendanceMap] = useState<
    Record<number, { status: AttendanceStatus; notes: string; isDirty?: boolean }>
  >({})

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Fetch classes on load
  useEffect(() => {
    classService.getClasses().then((res) => {
      if (res.success && res.data) {
        setClasses(res.data)
        if (!selectedClassId && res.data.length > 0) {
          setSelectedClassId(String(res.data[0].id))
        }
      }
    })
  }, [])

  // Load students and existing attendance for class & date
  const loadClassAttendance = useCallback(async () => {
    if (!selectedClassId) return
    setIsLoading(true)
    try {
      const [stdRes, attRes] = await Promise.all([
        classService.getClassStudents(selectedClassId),
        attendanceService.getByClass(selectedClassId, selectedDate),
      ])

      const fetchedStudents = stdRes.data || []
      setStudents(fetchedStudents)

      const existingAttendances = attRes.data || []
      const initialMap: Record<number, { status: AttendanceStatus; notes: string; isDirty?: boolean }> = {}

      fetchedStudents.forEach((std) => {
        const found = existingAttendances.find((a) => a.student_id === std.id)
        if (found) {
          initialMap[std.id] = { status: found.status, notes: found.notes || '', isDirty: false }
        } else {
          // Default to Hadir if not yet recorded
          initialMap[std.id] = { status: 'Hadir', notes: '', isDirty: true }
        }
      })

      setAttendanceMap(initialMap)
      setHasUnsavedChanges(false)
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat presensi kelas.', 'error', err.request_id)
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId, selectedDate])

  useEffect(() => {
    loadClassAttendance()
  }, [loadClassAttendance])

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        isDirty: true,
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleNotesChange = (studentId: number, notes: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
        isDirty: true,
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleMarkAllHadir = () => {
    setAttendanceMap((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        const id = Number(key)
        next[id] = { ...next[id], status: 'Hadir', isDirty: true }
      })
      return next
    })
    setHasUnsavedChanges(true)
    showToast('Semua siswa ditandai Hadir.', 'info')
  }

  const handleSaveAttendance = async () => {
    if (!selectedClassId) return
    setIsSaving(true)

    const payloadItems: BulkAttendanceItem[] = Object.entries(attendanceMap).map(([id, data]) => ({
      student_id: Number(id),
      status: data.status,
      notes: data.notes || undefined,
    }))

    try {
      const resp = await attendanceService.saveBulk({
        class_id: Number(selectedClassId),
        date: selectedDate,
        attendances: payloadItems,
      })
      if (resp.success) {
        showToast(`Presensi berhasil disimpan (${resp.data?.saved_count || payloadItems.length} siswa).`, 'success')
        setHasUnsavedChanges(false)
        setShowConfirmModal(false)
        loadClassAttendance()
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan presensi.', 'error', err.request_id)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate live counters
  const counts = Object.values(attendanceMap).reduce(
    (acc, curr) => {
      if (curr.status === 'Hadir') acc.hadir++
      else if (curr.status === 'Sakit') acc.sakit++
      else if (curr.status === 'Izin') acc.izin++
      else if (curr.status === 'Alpa') acc.alpa++
      return acc
    },
    { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi Siswa Harian"
        description="Pencatatan dan verifikasi kehadiran kelas per tanggal kalender sekolah"
        action={
          <div className="flex items-center gap-2">
            <a
              href={attendanceService.getExportUrl({
                class_id: selectedClassId ? Number(selectedClassId) : undefined,
                date_from: selectedDate,
                date_to: selectedDate,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Ekspor CSV
            </a>
            {canFinalize && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSaving || students.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            )}
          </div>
        }
      />

      {/* Control bar: Date and Class picker */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
            />
          </div>

          <div className="w-48">
            <FilterSelect
              value={selectedClassId}
              onChange={(val) => setSelectedClassId(val)}
              options={classes.map((c) => ({ label: `${c.name} (${c.grade_level})`, value: c.id }))}
              placeholder="Pilih Kelas..."
            />
          </div>
        </div>

        {/* Action Buttons: Mark all present & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {canFinalize && (
            <button
              type="button"
              onClick={handleMarkAllHadir}
              disabled={isLoading || students.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai Semua Hadir
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-navy-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-navy-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mode HP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Summary Counter Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">🟢 Hadir</span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{counts.hadir}</p>
          </div>
          <span className="text-xs text-emerald-600 font-mono">
            {students.length > 0 ? `${Math.round((counts.hadir / students.length) * 100)}%` : '0%'}
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800">🟡 Sakit</span>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{counts.sakit}</p>
          </div>
        </div>

        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-800">🔵 Izin</span>
            <p className="text-xl font-bold text-sky-900 mt-0.5">{counts.izin}</p>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800">🔴 Alpa</span>
            <p className="text-xl font-bold text-rose-900 mt-0.5">{counts.alpa}</p>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ada perubahan status presensi yang belum disimpan ke server.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="font-bold underline hover:text-amber-900"
          >
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Students Presensi List: Table View & Mobile Card View */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <LoadingSkeleton rows={6} />
        </div>
      ) : students.length > 0 ? (
        <>
          {/* 1. Desktop / Standard Table View */}
          <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${
            viewMode === 'table' ? 'block' : viewMode === 'cards' ? 'hidden' : 'hidden md:block'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 min-w-[280px]">Status Kehadiran</th>
                    <th className="py-3 px-4 min-w-[200px]">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((std, idx) => {
                    const current = attendanceMap[std.id] || { status: 'Hadir', notes: '' }
                    return (
                      <tr
                        key={std.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          current.isDirty ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{std.nis}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {std.name}
                          {std.gender && (
                            <span className="ml-1.5 text-[11px] text-slate-400">({std.gender})</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as AttendanceStatus[]).map((st) => {
                              const isSelected = current.status === st
                              let selectedBadge = 'bg-white text-slate-800 font-bold shadow-xs'
                              if (isSelected) {
                                if (st === 'Hadir') selectedBadge = 'bg-emerald-600 text-white font-bold'
                                else if (st === 'Sakit') selectedBadge = 'bg-amber-500 text-white font-bold'
                                else if (st === 'Izin') selectedBadge = 'bg-sky-600 text-white font-bold'
                                else if (st === 'Alpa') selectedBadge = 'bg-rose-600 text-white font-bold'
                              }

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(std.id, st)}
                                  className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                                    isSelected
                                      ? selectedBadge
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                >
                                  {st}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={current.notes}
                            onChange={(e) => handleNotesChange(std.id, e.target.value)}
                            placeholder="Catatan..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:ring-1 focus:ring-navy-600"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Touch-Friendly Cards View (Optimized for Mobile/HP in Classroom) */}
          <div className={`space-y-3 pb-16 sm:pb-0 ${
            viewMode === 'cards' ? 'block' : viewMode === 'table' ? 'hidden' : 'block md:hidden'
          }`}>
            {students.map((std, idx) => {
              const current = attendanceMap[std.id] || { status: 'Hadir', notes: '' }
              return (
                <div
                  key={std.id}
                  className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs transition-all ${
                    current.isDirty ? 'ring-1 ring-amber-400 bg-amber-50/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{std.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          NIS: {std.nis} {std.gender ? `• ${std.gender}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        current.status === 'Hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : current.status === 'Sakit'
                          ? 'bg-amber-100 text-amber-800'
                          : current.status === 'Izin'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {current.status}
                    </span>
                  </div>

                  {/* 4 Large Tactile Buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as AttendanceStatus[]).map((st) => {
                      const isSelected = current.status === st
                      let activeStyle = ''
                      if (isSelected) {
                        if (st === 'Hadir') activeStyle = 'bg-emerald-600 text-white shadow-xs font-bold'
                        else if (st === 'Sakit') activeStyle = 'bg-amber-500 text-white shadow-xs font-bold'
                        else if (st === 'Izin') activeStyle = 'bg-sky-600 text-white shadow-xs font-bold'
                        else if (st === 'Alpa') activeStyle = 'bg-rose-600 text-white shadow-xs font-bold'
                      } else {
                        activeStyle = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(std.id, st)}
                          className={`h-11 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${activeStyle}`}
                        >
                          <span className="text-[10px]">
                            {st === 'Hadir' ? '🟢' : st === 'Sakit' ? '🟡' : st === 'Izin' ? '🔵' : '🔴'}
                          </span>
                          <span>{st}</span>
                        </button>
                      )
                    })}
                  </div>

                  <input
                    type="text"
                    value={current.notes}
                    onChange={(e) => handleNotesChange(std.id, e.target.value)}
                    placeholder="Tambah catatan khusus (opsional)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-navy-600"
                  />
                </div>
              )
            })}
          </div>

          {/* Sticky Mobile Floating Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-emerald-700">🟢 {counts.hadir}</span>
              <span className="text-amber-700">🟡 {counts.sakit}</span>
              <span className="text-sky-700">🔵 {counts.izin}</span>
              <span className="text-rose-700">🔴 {counts.alpa}</span>
            </div>
            {canFinalize && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-700 active:bg-navy-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          Tidak ada siswa yang terdaftar pada kelas yang dipilih.
        </div>
      )}

      {/* Confirmation Dialog before batch saving */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        title="Simpan Presensi Kelas"
        message={`Apakah Anda yakin ingin menyimpan perubahan presensi untuk tanggal ${selectedDate}? Data akan disimpan secara massal dengan transaksi aman.`}
        confirmLabel="Ya, Simpan Presensi"
        isLoading={isSaving}
        onConfirm={handleSaveAttendance}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  )
}
