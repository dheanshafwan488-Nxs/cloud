import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Calendar,
  UserCheck,
  GraduationCap,
  Sparkles,
  School,
  ArrowLeft,
} from 'lucide-react'
import { complaintService } from '../../services/complaintService'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'

const QUICK_VIOLATION_TAGS = [
  'Merokok di Lingkungan Sekolah',
  'Bolos Jam Pelajaran / Sekolah',
  'Membawa Handphone saat Ujian',
  'Perkelahian / Tawuran Antar Pelajar',
  'Perundungan / Bullying Fisik & Verbal',
  'Terlambat Masuk Sekolah Berulang Kali',
  'Merusak Fasilitas / Sarana Sekolah',
  'Pelecehan / Perilaku Tidak Pantas',
  'Memeras / Memalak Uang Teman',
]

export function StudentComplaintPublicPage() {
  const { settings } = useSchoolSettings()

  const [classes, setClasses] = useState<Array<{ id: number; name: string; grade_level?: string }>>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)

  // Reporter (Siswa yang Melapor) states
  const [reporterClassId, setReporterClassId] = useState<string>('')
  const [reporterStudents, setReporterStudents] = useState<Array<{ id: number; name: string; nis: string }>>([])
  const [isLoadingReporterStudents, setIsLoadingReporterStudents] = useState(false)
  const [reporterStudentId, setReporterStudentId] = useState<string>('')

  // Reported Student (Siswa yang Dilaporkan) states
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [students, setStudents] = useState<Array<{ id: number; name: string; nis: string }>>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  // Incident & Attachment states
  const [manualViolation, setManualViolation] = useState<string>('')
  const [incidentAt, setIncidentAt] = useState<string>(new Date().toISOString().split('T')[0])
  const [chronology, setChronology] = useState<string>('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Submission & UI states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<{
    complaint_code: string
    reporter_name: string
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
        setErrorMessage(err.message || 'Gagal memuat daftar kelas. Pastikan server backend aktif.')
      })
      .finally(() => {
        setIsLoadingClasses(false)
      })
  }, [])

  // Fetch reporter students when reporter class is selected
  useEffect(() => {
    if (!reporterClassId) {
      setReporterStudents([])
      setReporterStudentId('')
      return
    }

    setIsLoadingReporterStudents(true)
    setReporterStudentId('')
    complaintService
      .getPublicStudentsByClass(reporterClassId)
      .then((res) => {
        if (res.success && res.data) {
          setReporterStudents(res.data)
        }
      })
      .catch(() => {
        setReporterStudents([])
      })
      .finally(() => {
        setIsLoadingReporterStudents(false)
      })
  }, [reporterClassId])

  // Fetch reported students when reported class is selected
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
    } else if (!manualViolation.includes(tag)) {
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setAttachment(file)
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file))
      } else {
        setPreviewUrl(null)
      }
      setErrorMessage(null)
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
    setErrorMessage(null)

    if (!reporterClassId) {
      setErrorMessage('Pilih kelas Anda terlebih dahulu pada bagian Identitas Siswa Pelapor.')
      return
    }

    if (!reporterStudentId) {
      setErrorMessage('Pilih nama Anda sebagai siswa pelapor untuk mencegah laporan palsu/fitnah.')
      return
    }

    if (!selectedClassId) {
      setErrorMessage('Pilih kelas siswa yang ingin dilaporkan.')
      return
    }

    if (!selectedStudentId) {
      setErrorMessage('Pilih nama siswa yang ingin dilaporkan.')
      return
    }

    if (reporterStudentId === selectedStudentId) {
      setErrorMessage('Siswa pelapor dan siswa yang dilaporkan tidak boleh orang yang sama.')
      return
    }

    if (!manualViolation.trim()) {
      setErrorMessage('Ketik jenis pelanggaran yang terjadi (misal: merokok, bolos, membawa HP, dll).')
      return
    }

    if (!chronology.trim() || chronology.trim().length < 10) {
      setErrorMessage('Kronologi kejadian minimal 10 karakter agar dapat diverifikasi Guru BK.')
      return
    }

    if (!attachment) {
      setErrorMessage('Bukti foto kejadian wajib diunggah. Silakan pilih file foto bukti.')
      document.getElementById('section-attachment')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await complaintService.submitPublicComplaint({
        reporter_class_id: Number(reporterClassId),
        reporter_student_id: Number(reporterStudentId),
        class_id: Number(selectedClassId),
        student_id: Number(selectedStudentId),
        manual_violation: manualViolation.trim(),
        chronology: chronology.trim(),
        incident_at: incidentAt,
        attachment,
      })

      if (res.success && res.data) {
        setSubmittedData({
          complaint_code: res.data.complaint_code,
          reporter_name: res.data.reporter_name,
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
    setReporterClassId('')
    setReporterStudentId('')
    setSelectedClassId('')
    setSelectedStudentId('')
    setManualViolation('')
    setIncidentAt(new Date().toISOString().split('T')[0])
    setChronology('')
    handleRemoveAttachment()
    setErrorMessage(null)
    setSubmittedData(null)
  }

  const schoolName = settings?.school_name || 'SMK IPTEK SANGGABUANA'

  return (
    <div className="min-h-screen bg-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-900 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-navy-900 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Portal Login Guru BK</span>
          </Link>
          <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-emerald-700" /> Jalur Pelaporan Resmi Siswa
          </span>
        </div>

        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-900 text-white shadow-sm border border-navy-800 mb-3.5">
            <School className="w-7 h-7 text-white" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-navy-800 mb-1">
            Layanan Bimbingan Konseling (BK)
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Formulir Pengaduan Siswa
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-700">{schoolName}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Akses langsung via QR Code tanpa login • Terverifikasi untuk mencegah laporan palsu / fitnah
          </p>
        </div>

        {/* Success View */}
        {submittedData ? (
          <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-lg border border-slate-200 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              Pengaduan Berhasil Dikirim
            </h2>
            <p className="text-sm text-slate-700 mt-2 max-w-md mx-auto leading-relaxed">
              Laporan dan bukti foto Anda telah tercatat resmi di sistem. Data ini langsung masuk ke dasbor{' '}
              <strong className="text-slate-900">Guru BK</strong> untuk diverifikasi dan ditindaklanjuti.
            </p>

            {/* Ticket Info Card */}
            <div className="my-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  Nomor Tiket Kasus
                </span>
                <span className="font-mono font-bold text-navy-900 bg-white px-3 py-1 rounded-lg border border-slate-300 shadow-2xs">
                  {submittedData.complaint_code}
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-600 font-semibold shrink-0">Pelapor (Rahasia):</span>
                <span className="font-bold text-slate-900 text-right">{submittedData.reporter_name}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-600 font-semibold shrink-0">Siswa Terlapor:</span>
                <span className="font-bold text-slate-900 text-right">
                  {submittedData.student_name} ({submittedData.class_name})
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-600 font-semibold shrink-0">Jenis Pelanggaran:</span>
                <span className="font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 text-right">
                  {submittedData.manual_violation}
                </span>
              </div>
            </div>

            <div className="p-4 bg-navy-50 border border-navy-200 rounded-xl text-navy-950 text-xs text-left flex items-start gap-2.5 mb-6 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-navy-700 shrink-0 mt-0.5" />
              <span>
                <strong>Jaminan Kerahasiaan Pelapor:</strong> Nama Anda hanya dicatat untuk verifikasi agar tidak terjadi fitnah, dan{' '}
                <strong>hanya dapat dilihat oleh Guru BK</strong>. Identitas pelapor tidak akan pernah ditampilkan kepada siswa yang dilaporkan maupun orang tua terlapor.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-6 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" /> Kirim Pengaduan Lain
              </button>
              <Link
                to="/login"
                className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          /* Form Card */
          <div className="bg-white rounded-2xl p-6 sm:p-9 shadow-lg border border-slate-200">
            {/* Confidentiality & Anti-Slander Notice */}
            <div className="mb-7 p-4 rounded-xl bg-navy-50/70 border border-navy-200 flex items-start gap-3">
              <div className="p-2 bg-navy-900 text-white rounded-lg shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-800 space-y-1 leading-relaxed">
                <p className="font-bold text-navy-950 text-sm">
                  Kerahasiaan Pelapor Dijamin • Hanya Diketahui Guru BK
                </p>
                <p className="text-slate-700">
                  Demi mencegah laporan palsu atau fitnah, siswa pelapor <strong>wajib memilih identitas dirinya sendiri</strong> dan menyertakan bukti foto. Tenang saja, identitas pelapor dijaga kerahasiaannya dan <strong>hanya Guru BK yang mengetahui</strong>.
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-6 p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs sm:text-sm font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Identitas Siswa yang Melapor (Wajib) */}
              <div className="space-y-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-950">
                    <UserCheck className="w-4 h-4 text-navy-700" />
                    <span>
                      1. Identitas Siswa yang Melapor <span className="text-rose-600">*</span>
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Khusus Guru BK
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Pilih kelas dan nama Anda sendiri sebagai pelapor yang bertanggung jawab. Nama Anda tidak akan dibocorkan kepada pihak yang dilaporkan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reporter Class */}
                  <div>
                    <label
                      htmlFor="select-reporter-class"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Kelas Anda (Pelapor) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-reporter-class"
                      required
                      value={reporterClassId}
                      onChange={(e) => setReporterClassId(e.target.value)}
                      disabled={isLoadingClasses}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Pilih Kelas Anda --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reporter Student */}
                  <div>
                    <label
                      htmlFor="select-reporter-student"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Nama Anda (Pelapor) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-reporter-student"
                      required
                      value={reporterStudentId}
                      onChange={(e) => setReporterStudentId(e.target.value)}
                      disabled={!reporterClassId || isLoadingReporterStudents}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all disabled:bg-slate-100 disabled:text-slate-500 shadow-2xs"
                    >
                      <option value="">
                        {!reporterClassId
                          ? '-- Pilih kelas Anda dahulu --'
                          : isLoadingReporterStudents
                          ? 'Memuat daftar siswa...'
                          : reporterStudents.length === 0
                          ? 'Tidak ada siswa aktif'
                          : '-- Pilih Nama Anda --'}
                      </option>
                      {reporterStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.nis})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Siswa yang Dilaporkan */}
              <div className="space-y-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-950">
                  <GraduationCap className="w-4 h-4 text-rose-700" />
                  <span>
                    2. Siswa yang Ingin Dilaporkan <span className="text-rose-600">*</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Reported Class */}
                  <div>
                    <label
                      htmlFor="select-class"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Kelas Siswa Terlapor <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-class"
                      required
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      disabled={isLoadingClasses}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Pilih Kelas Terlapor --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Reported Student */}
                  <div>
                    <label
                      htmlFor="select-student"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Nama Siswa yang Dilapor <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="select-student"
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!selectedClassId || isLoadingStudents}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all disabled:bg-slate-100 disabled:text-slate-500 shadow-2xs"
                    >
                      <option value="">
                        {!selectedClassId
                          ? '-- Pilih kelas terlapor dahulu --'
                          : isLoadingStudents
                          ? 'Memuat daftar siswa...'
                          : students.length === 0
                          ? 'Tidak ada siswa aktif'
                          : '-- Pilih Nama Siswa --'}
                      </option>
                      {students.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={String(s.id) === reporterStudentId}
                        >
                          {s.name} (NIS: {s.nis})
                          {String(s.id) === reporterStudentId ? ' — Pelapor' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Pelanggaran (Diisi Manual) */}
              <div className="space-y-3">
                <label
                  htmlFor="input-manual-violation"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                  3. Jenis Pelanggaran (Diisi Manual) <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-slate-600">
                  Tuliskan pelanggaran yang terjadi (misal: merokok, bolos pelajaran, membawa HP saat ujian, perundungan, dll) atau klik pilihan cepat di bawah.
                </p>

                <input
                  id="input-manual-violation"
                  type="text"
                  required
                  value={manualViolation}
                  onChange={(e) => setManualViolation(e.target.value)}
                  placeholder="Contoh: Merokok di belakang toilet, bolos sekolah, membawa HP saat ujian..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all font-semibold shadow-2xs placeholder:text-slate-400"
                />

                {/* Quick Selection Tags */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pilihan Cepat (Klik untuk menambahkan):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_VIOLATION_TAGS.map((tag) => {
                      const isSelected = manualViolation.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleSelectTag(tag)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-navy-900 text-white border-navy-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Tanggal Kejadian & Kronologi */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="input-incident-date"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5"
                  >
                    4. Tanggal Kejadian <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="input-incident-date"
                      type="date"
                      required
                      value={incidentAt}
                      onChange={(e) => setIncidentAt(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="textarea-chronology"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5"
                  >
                    5. Kronologi & Keterangan Lengkap <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="textarea-chronology"
                    rows={4}
                    required
                    value={chronology}
                    onChange={(e) => setChronology(e.target.value)}
                    placeholder="Ceritakan kejadian secara objektif dan jelas: lokasi, waktu, kronologi peristiwa, serta informasi pendukung lainnya..."
                    className="w-full p-4 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all leading-relaxed shadow-2xs font-medium placeholder:text-slate-400"
                  />
                  <p className="text-xs font-medium text-slate-600 mt-1">Minimal 10 karakter.</p>
                </div>
              </div>

              {/* 6. Upload Bukti Foto (Wajib Diisi) */}
              <div id="section-attachment" className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                    6. Bukti Foto / Dokumen Kejadian <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Wajib Diunggah *
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Wajib melampirkan bukti foto kejadian atau tangkapan layar agar laporan valid dan dapat segera diverifikasi Guru BK.
                </p>

                {!attachment ? (
                  <label className="cursor-pointer flex flex-col items-center justify-center p-7 border-2 border-dashed border-slate-300 hover:border-navy-700 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition-all group">
                    <div className="p-3 bg-white border border-slate-300 group-hover:bg-navy-900 text-slate-700 group-hover:text-white rounded-xl mb-2.5 transition-colors shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-navy-900">
                      Pilih & Unggah Foto Bukti Kejadian <span className="text-rose-600 font-bold">*</span>
                    </span>
                    <span className="text-xs font-medium text-slate-600 mt-1">
                      Format didukung: JPG, PNG, WEBP, atau PDF • Maksimal 5 MB
                    </span>
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Pratinjau Bukti Foto"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-navy-900 text-white flex items-center justify-center rounded-xl font-bold text-xs shrink-0 shadow-2xs">
                          DOKUMEN
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate">{attachment.name}</p>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {(attachment.size / 1024).toFixed(0)} KB • Bukti siap dikirim ke Guru BK
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Ganti File
                    </button>
                  </div>
                )}
              </div>

              {/* Accountability Statement */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Dengan mengirim laporan ini, saya menyatakan bahwa informasi dan bukti yang disampaikan adalah benar sesuai fakta di lapangan.
                </span>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-complaint"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-navy-900 hover:bg-navy-950 active:bg-slate-950 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-50"
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

        {/* Footer info */}
        <div className="mt-8 text-center text-xs font-medium text-slate-600 space-y-1">
          <p>
            © {new Date().getFullYear()} {schoolName} • Bimbingan Konseling & Kedisiplinan Siswa
          </p>
          <p className="text-[11px] text-slate-500">
            Sistem resmi & terlindungi — Identitas pelapor hanya diakses oleh Guru BK.
          </p>
        </div>
      </div>
    </div>
  )
}
