import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Calendar,
  User,
  GraduationCap,
  Sparkles,
  FileText,
  School,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { complaintService } from '../../services/complaintService'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'

const QUICK_VIOLATION_TAGS = [
  'Merokok di Lingkungan Sekolah',
  'Bolos Jam Pelajaran / Sekolah',
  'Membawa Handphone saat Ujian / Pelajaran',
  'Perkelahian / Tawuran Antar Pelajar',
  'Perundungan / Bullying Fisik atau Verbal',
  'Terlambat Masuk Sekolah Berulang Kali',
  'Merusak Fasilitas / Sarana Sekolah',
  'Pelecehan / Perilaku Tidak Pantas',
  'Memeras / Memalak Uang Teman',
]

export function StudentComplaintPublicPage() {
  const { settings } = useSchoolSettings()

  const [classes, setClasses] = useState<Array<{ id: number; name: string; level: string; major: string }>>([])
  const [students, setStudents] = useState<Array<{ id: number; name: string; nis: string }>>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // Form states
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [manualViolation, setManualViolation] = useState<string>('')
  const [incidentAt, setIncidentAt] = useState<string>(new Date().toISOString().split('T')[0])
  const [chronology, setChronology] = useState<string>('')
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true)
  const [reporterName, setReporterName] = useState<string>('')
  const [attachment, setAttachment] = useState<File | null>(null)

  // Submission & UI states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<{
    complaint_code: string
    student_name: string
    class_name: string
    manual_violation: string
    incident_at: string
  } | null>(null)

  // Fetch active classes on mount
  useEffect(() => {
    setIsLoadingClasses(true)
    complaintService
      .getPublicClasses()
      .then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Gagal memuat daftar kelas. Pastikan server aktif.')
      })
      .finally(() => {
        setIsLoadingClasses(false)
      })
  }, [])

  // Fetch students when a class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([])
      setSelectedStudentId('')
      return
    }

    setIsLoadingStudents(true)
    setSelectedStudentId('')
    complaintService
      .getPublicStudentsByClass(selectedClassId)
      .then((res) => {
        if (res.success && res.data) {
          setStudents(res.data)
        }
      })
      .catch(() => {
        setStudents([])
      })
      .finally(() => {
        setIsLoadingStudents(false)
      })
  }, [selectedClassId])

  const handleSelectTag = (tag: string) => {
    if (!manualViolation) {
      setManualViolation(tag)
    } else if (manualViolation.includes(tag)) {
      // do nothing or toggle
    } else {
      setManualViolation(`${manualViolation}, ${tag}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Ukuran file bukti maksimal 5 MB.')
        return
      }
      setAttachment(file)
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedClassId) {
      setErrorMessage('Pilih kelas siswa yang ingin dilaporkan.')
      return
    }

    if (!selectedStudentId) {
      setErrorMessage('Pilih nama siswa yang ingin dilaporkan.')
      return
    }

    if (!manualViolation.trim()) {
      setErrorMessage('Ketik jenis pelanggaran yang terjadi (misal: merokok, bolos, dll).')
      return
    }

    if (!chronology.trim() || chronology.trim().length < 10) {
      setErrorMessage('Keterangan kejadian minimal 10 karakter.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await complaintService.submitPublicComplaint({
        class_id: Number(selectedClassId),
        student_id: Number(selectedStudentId),
        manual_violation: manualViolation.trim(),
        chronology: chronology.trim(),
        incident_at: incidentAt,
        reporter_name: isAnonymous ? 'Siswa (Anonim / Rahasia)' : reporterName.trim() || 'Siswa (Tidak Disebutkan)',
        attachment: attachment || undefined,
      })

      if (res.success && res.data) {
        setSubmittedData({
          complaint_code: res.data.complaint_code,
          student_name: res.data.student_name,
          class_name: res.data.class_name,
          manual_violation: res.data.manual_violation,
          incident_at: res.data.incident_at,
        })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim pengaduan. Silakan periksa koneksi dan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setSelectedClassId('')
    setSelectedStudentId('')
    setManualViolation('')
    setIncidentAt(new Date().toISOString().split('T')[0])
    setChronology('')
    setIsAnonymous(true)
    setReporterName('')
    setAttachment(null)
    setErrorMessage(null)
    setSubmittedData(null)
  }

  const schoolName = settings?.school_name || 'SMK IPTEK SANGGABUANA'

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portal Guru BK
          </Link>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Jalur Pelaporan Aman Siswa
          </span>
        </div>

        {/* Branding Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-800 text-blue-400 border border-navy-700 shadow-xl mb-3">
            <School className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Formulir Pengaduan Siswa
          </h1>
          <p className="mt-1 text-sm text-slate-300 font-medium">
            Layanan Bimbingan Konseling (BK) – {schoolName}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Scan Barcode / Akses Cepat Tanpa Perlu Login Akun
          </p>
        </div>

        {/* Success View */}
        {submittedData ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              Laporan Berhasil Terkirim!
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Terima kasih atas kepedulian Anda. Laporan pengaduan telah diterima secara langsung oleh <strong>Guru BK</strong> dan akan ditindaklanjuti secara bijaksana dan rahasia.
            </p>

            {/* Ticket Info Card */}
            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Nomor Kasus / Tiket:</span>
                <span className="font-mono font-bold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded-lg border border-navy-200">
                  {submittedData.complaint_code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Siswa Terlapor:</span>
                <span className="font-semibold text-slate-900">{submittedData.student_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kelas:</span>
                <span className="font-semibold text-slate-800">{submittedData.class_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Jenis Pelanggaran:</span>
                <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {submittedData.manual_violation}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs text-left flex items-start gap-2 mb-6">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Jaminan Perlindungan:</strong> Informasi pelapor dirahasiakan dan hanya dapat diakses oleh staf Guru BK SMK IPTEK SANGGABUANA.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Kirim Laporan Lain
              </button>
              <Link
                to="/login"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          /* Form Card */
          <div className="bg-white/98 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            {/* Guarantee Badge */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  100% Rahasia & Bebas Login
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Siswa tidak perlu memiliki akun untuk melapor. Identitas pelapor dijamin aman dan Anda dapat memilih untuk mengirim laporan secara anonim.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Pilih Kelas & Siswa */}
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-800">
                  <GraduationCap className="w-4 h-4 text-navy-600" />
                  <span>1. Siswa yang Ingin Dilaporkan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Class */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Pilih Kelas Siswa <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-class"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      disabled={isLoadingClasses}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.major})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Student */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Siswa yang Dilapor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-student"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!selectedClassId || isLoadingStudents}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">
                        {!selectedClassId
                          ? '-- Pilih kelas terlebih dahulu --'
                          : isLoadingStudents
                          ? 'Memuat daftar siswa...'
                          : students.length === 0
                          ? 'Tidak ada data siswa'
                          : '-- Pilih Nama Siswa --'}
                      </option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.nis})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Pelanggaran (Diisi Manual) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                  2. Jenis Pelanggaran (Diisi Manual) <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500">
                  Tuliskan jenis pelanggaran yang dilakukan (bisa bebas seperti merokok, bolos, membawa handphone, atau lainnya).
                </p>

                <input
                  id="input-manual-violation"
                  type="text"
                  required
                  value={manualViolation}
                  onChange={(e) => setManualViolation(e.target.value)}
                  placeholder="Contoh: Merokok di belakang toilet, bolos pelajaran, membawa handphone saat ujian..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:bg-white transition-all font-medium"
                />

                {/* Quick Selection Tags */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Contoh Cepat (Klik untuk memilih/mengisi otomatis):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_VIOLATION_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectTag(tag)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          manualViolation.includes(tag)
                            ? 'bg-rose-100 text-rose-800 border-rose-300 font-semibold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Waktu Kejadian & Kronologi */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1.5">
                    3. Tanggal / Waktu Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="input-incident-date"
                      type="date"
                      required
                      value={incidentAt}
                      onChange={(e) => setIncidentAt(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1.5">
                    4. Kronologi & Keterangan Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="textarea-chronology"
                    rows={4}
                    required
                    value={chronology}
                    onChange={(e) => setChronology(e.target.value)}
                    placeholder="Ceritakan kejadian secara jelas: di mana lokasi kejadiannya, kapan, apa yang sedang dilakukan, dan saksi atau informasi pendukung lainnya..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:bg-white transition-all leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Minimal 10 karakter.</p>
                </div>
              </div>

              {/* 5. Identitas Pelapor (Opsi Anonim) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                  5. Identitas Pelapor (Pilihan Kerahasiaan)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isAnonymous
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">100% Anonim (Rahasia)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Identitas Anda tidak dicantumkan dan tidak diketahui siapapun.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      !isAnonymous
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">Sebutkan Nama Saya</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tulis nama Anda agar Guru BK dapat menghubungi secara personal.
                    </p>
                  </button>
                </div>

                {!isAnonymous && (
                  <div className="mt-2 animate-fade-in">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama atau Kelas Pelapor
                    </label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Tuliskan nama Anda dan kelas (misal: Rian - X RPL 2)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  </div>
                )}
              </div>

              {/* 6. Upload Bukti Foto (Opsional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-800 mb-1.5">
                  6. Bukti Foto / Dokumen (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Pilih File Foto / Dokumen
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {attachment ? (
                    <span className="text-xs text-slate-700 font-medium truncate max-w-xs">
                      📎 {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">JPG, PNG, PDF (Maksimal 5 MB)</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-complaint"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-navy-800 to-navy-900 hover:from-navy-900 hover:to-slate-900 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim Laporan ke Guru BK...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Pengaduan Sekarang</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Sistem Pengaduan Siswa & Bimbingan Konseling • {schoolName}
        </p>
      </div>
    </div>
  )
}

