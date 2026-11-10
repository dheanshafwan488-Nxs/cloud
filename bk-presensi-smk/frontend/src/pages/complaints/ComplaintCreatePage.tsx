import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Upload, ShieldCheck, AlertCircle } from 'lucide-react'
import { studentService } from '../../services/studentService'
import { classService } from '../../services/classService'
import { violationService } from '../../services/violationService'
import { complaintService, CreateComplaintPayload } from '../../services/complaintService'
import { Student, SchoolClass, Violation } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { showToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

export function ComplaintCreatePage() {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const isSiswa = user?.role === 'siswa'

  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [violations, setViolations] = useState<Violation[]>([])

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('')
  const [chronology, setChronology] = useState('')
  const [incidentAt, setIncidentAt] = useState(
    new Date().toISOString().slice(0, 16)
  )
  const [selectedViolationIds, setSelectedViolationIds] = useState<number[]>([])
  const [parentVisible, setParentVisible] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    studentService.getStudents({ per_page: 100 }).then((res) => {
      if (res.success && res.data) {
        setStudents(res.data)
        if (isSiswa && res.data.length > 0) {
          // If student role, pre-select student
          setSelectedStudentId(res.data[0].id)
          setSelectedClassId(res.data[0].class_id)
        }
      }
    })

    classService.getClasses().then((res) => {
      if (res.success && res.data) setClasses(res.data)
    })

    violationService.getViolations({ is_active: true }).then((res) => {
      if (res.success && res.data) setViolations(res.data)
    })
  }, [isSiswa])

  const handleStudentSelect = (studentId: number) => {
    setSelectedStudentId(studentId)
    const std = students.find((s) => s.id === studentId)
    if (std) {
      setSelectedClassId(std.class_id)
    }
  }

  const handleToggleViolation = (violationId: number) => {
    setSelectedViolationIds((prev) =>
      prev.includes(violationId)
        ? prev.filter((id) => id !== violationId)
        : [...prev, violationId]
    )}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!selectedStudentId) {
      setErrors({ student_id: ['Pilih siswa yang bersangkutan.'] })
      return
    }
    if (!chronology.trim()) {
      setErrors({ chronology: ['Kronologi kejadian wajib diceritakan secara jelas.'] })
      return
    }

    const payload: CreateComplaintPayload = {
      student_id: Number(selectedStudentId),
      class_id: selectedClassId ? Number(selectedClassId) : undefined,
      chronology,
      incident_at: incidentAt,
      violation_ids: selectedViolationIds,
      parent_visible: parentVisible,
      file: attachment || undefined,
    }

    setIsSubmitting(true)
    try {
      const resp = await complaintService.createComplaint(payload)
      if (resp.success) {
        showToast(
          `Pengaduan berhasil dibuat dengan kode: ${resp.data?.complaint_code || 'Laporan Baru'}`,
          'success'
        )
        navigate('/complaints')
      }
    } catch (err: any) {
      if (err.errors) setErrors(err.errors)
      showToast(err.message || 'Gagal mengirim pengaduan.', 'error', err.request_id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Pengaduan
        </Link>
      </div>

      <PageHeader
        title="Buat Pengaduan BK Baru"
        description="Pencatatan kasus, pelanggaran tata tertib, atau aduan konseling SMK IPTEK SANGGABUANA"
      />

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Student Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Siswa Terkait" required error={errors.student_id?.[0]}>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(Number(e.target.value))}
              disabled={isSiswa}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
            >
              <option value="">Pilih Siswa...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nis} - {s.name} ({s.class?.name || 'Kelas'})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Waktu Kejadian" required error={errors.incident_at?.[0]}>
            <input
              type="datetime-local"
              required
              value={incidentAt}
              onChange={(e) => setIncidentAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
            />
          </FormField>
        </div>

        {/* Violations Category Checkboxes */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Kategori Pelanggaran (Opsional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {violations.map((v) => {
              const isChecked = selectedViolationIds.includes(v.id)
              return (
                <label
                  key={v.id}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isChecked ? 'bg-navy-50 text-navy-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleViolation(v.id)}
                    className="mt-0.5 rounded text-navy-600 focus:ring-navy-500"
                  />
                  <div className="flex-1">
                    <span>{v.name}</span>
                    <span className="text-rose-600 font-mono ml-1">+{v.points}p</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Chronology Textarea */}
        <FormField
          label="Kronologi Kejadian"
          required
          hint="Jelaskan detail kronologi kejadian secara objektif dan lengkap."
          error={errors.chronology?.[0]}
        >
          <textarea
            rows={5}
            required
            value={chronology}
            onChange={(e) => setChronology(e.target.value)}
            placeholder="Tuliskan kronologi..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
          />
        </FormField>

        {/* Attachment Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Lampiran Bukti (Opsional)
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{attachment ? attachment.name : 'Pilih Bukti (Foto / PDF)'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {attachment && (
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-xs text-rose-600 hover:underline"
              >
                Hapus Lampiran
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Maks. 5MB, format didukung: JPG, PNG, PDF.</p>
        </div>

        {/* Visibility to Parent toggle */}
        {hasRole(['admin', 'guru_bk']) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-800">
                Terlihat oleh Orang Tua / Wali di Bot Telegram?
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Jika diaktifkan, orang tua yang terverifikasi dapat melihat ringkasan kasus ini melalui menu /kasus.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={parentVisible}
                onChange={(e) => setParentVisible(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-600"></div>
            </label>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/complaints"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengaduan'}
          </button>
        </div>
      </form>
    </div>
  )
}
