import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Upload, Lock } from 'lucide-react'
import { studentService } from '../../services/studentService'
import { violationService } from '../../services/violationService'
import { complaintService, CreateComplaintPayload } from '../../services/complaintService'
import { Student, Violation } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { showToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

export function ComplaintCreatePage() {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const isSiswa = user?.role === 'siswa'

  const [students, setStudents] = useState<Student[]>([])
  const [violations, setViolations] = useState<Violation[]>([])

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('')
  const [reporterName, setReporterName] = useState(user?.name || '')
  const [chronology, setChronology] = useState('')
  const [incidentAt, setIncidentAt] = useState(new Date().toISOString().slice(0, 16))
  const [selectedViolationIds, setSelectedViolationIds] = useState<number[]>([])
  const [parentVisible, setParentVisible] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    studentService.getStudents({ per_page: 200 }).then((res) => {
      if (res.success && res.data) {
        setStudents(res.data)
        if (isSiswa && res.data.length > 0) {
          setSelectedStudentId(res.data[0].id)
          setSelectedClassId(res.data[0].class_id)
        }
      }
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
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setAttachment(file)
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveAttachment = () => {
    setAttachment(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!selectedStudentId) {
      setErrors({ student_id: ['Pilih siswa yang bersangkutan.'] })
      return
    }
    if (!chronology.trim() || chronology.trim().length < 10) {
      setErrors({ chronology: ['Kronologi kejadian minimal 10 karakter.'] })
      return
    }
    if (!attachment) {
      setErrors({ attachment: ['Lampiran bukti foto atau dokumen wajib diunggah.'] })
      return
    }

    const payload: CreateComplaintPayload = {
      student_id: Number(selectedStudentId),
      class_id: selectedClassId ? Number(selectedClassId) : undefined,
      reporter_name: reporterName.trim() || undefined,
      chronology,
      incident_at: incidentAt,
      violation_ids: selectedViolationIds,
      parent_visible: parentVisible,
      file: attachment,
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-navy-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Pengaduan
        </Link>
      </div>

      <PageHeader
        title="Buat Pengaduan BK Baru"
        description="Pencatatan kasus, pelanggaran tata tertib, atau aduan konseling SMK IPTEK SANGGABUANA"
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6"
      >
        {/* Student & Incident Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Siswa yang Dilaporkan" required error={errors.student_id?.[0]}>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(Number(e.target.value))}
              disabled={isSiswa}
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 focus:outline-none shadow-2xs"
            >
              <option value="">-- Pilih Siswa Terlapor --</option>
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
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 focus:outline-none shadow-2xs"
            />
          </FormField>
        </div>

        {/* Reporter Identity (Private to Guru BK) */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Identitas Pelapor (Siswa / Guru / Petugas)
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Hanya Diketahui Guru BK
            </span>
          </div>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="Contoh: Nama Siswa Pelapor (Kelas) atau Guru yang melaporkan"
            className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 focus:outline-none shadow-2xs placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-600">
            Dicatat secara internal agar setiap laporan dapat dipertanggungjawabkan dan bebas dari fitnah.
          </p>
        </div>

        {/* Violations Category Checkboxes */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Kategori Pelanggaran (Opsional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            {violations.map((v) => {
              const isChecked = selectedViolationIds.includes(v.id)
              return (
                <label
                  key={v.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                    isChecked
                      ? 'bg-navy-50 text-navy-950 font-bold border-navy-300'
                      : 'bg-white hover:bg-slate-100 text-slate-800 font-medium border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleViolation(v.id)}
                    className="mt-0.5 rounded border-slate-400 text-navy-800 focus:ring-navy-600"
                  />
                  <div className="flex-1">
                    <span>{v.name}</span>
                    <span className="text-rose-700 font-mono font-bold ml-1.5">+{v.points}p</span>
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
          hint="Jelaskan detail kronologi kejadian secara objektif dan lengkap (minimal 10 karakter)."
          error={errors.chronology?.[0]}
        >
          <textarea
            rows={5}
            required
            value={chronology}
            onChange={(e) => setChronology(e.target.value)}
            placeholder="Tuliskan kronologi lengkap kejadian..."
            className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 focus:outline-none shadow-2xs placeholder:text-slate-400"
          />
        </FormField>

        {/* Attachment Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-800">
              Lampiran Bukti Foto / Dokumen <span className="text-rose-600 font-bold">*</span>
            </label>
            <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Wajib Diunggah *
            </span>
          </div>

          {!attachment ? (
            <label className="cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-navy-700 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all group">
              <div className="p-2.5 bg-white border border-slate-300 group-hover:bg-navy-900 text-slate-700 group-hover:text-white rounded-xl mb-2 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">
                Pilih Bukti Foto / PDF <span className="text-rose-600">*</span>
              </span>
              <span className="text-xs text-slate-600 mt-0.5">
                JPG, PNG, WEBP, atau PDF • Maksimal 5 MB
              </span>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Pratinjau bukti"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-navy-900 text-white rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0">
                    PDF
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{attachment.name}</p>
                  <p className="text-xs text-slate-600">
                    {(attachment.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg cursor-pointer shrink-0"
              >
                Ganti
              </button>
            </div>
          )}

          {(errors.attachment || errors.file) && (
            <p className="text-xs text-rose-700 mt-1 font-semibold">
              {errors.attachment?.[0] || errors.file?.[0]}
            </p>
          )}
        </div>

        {/* Visibility to Parent toggle */}
        {hasRole(['admin', 'guru_bk']) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-slate-900">
                Terlihat oleh Orang Tua / Wali di Bot Telegram?
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Jika diaktifkan, orang tua yang terverifikasi dapat melihat ringkasan kasus ini (identitas pelapor tetap dirahasiakan).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={parentVisible}
                onChange={(e) => setParentVisible(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-800"></div>
            </label>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to="/complaints"
            className="px-4 py-2.5 text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Mengirim...' : 'Simpan Pengaduan'}
          </button>
        </div>
      </form>
    </div>
  )
}
