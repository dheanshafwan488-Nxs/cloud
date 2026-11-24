import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Printer,
  FileText,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Edit3,
  User,
  RotateCcw,
  UserCheck,
  Save,
  Building2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { complaintService } from '../../services/complaintService'
import { OfficialLetterData } from '../../types'
import { showToast } from '../../hooks/useToast'

interface OfficialLetterModalProps {
  isOpen: boolean
  onClose: () => void
  complaintId: number | string
}

interface SavedLetterDraft {
  customGuruBkName: string
  customGuruBkNip: string
  customGuruBkTitle: string
  customCounselor: string
  customKepsekName: string
  customKepsekNip: string
  customKepsekTitle: string
  includeWaliKelasTtd: boolean
  customWaliKelasName: string
  customWaliKelasNip: string
  customScheduleDate: string
  customScheduleTime: string
  customScheduleRoom: string
  customLetterNumber: string
  customLetterTitle: string
  customIssuedPlaceDate: string
  customChronology: string
  customSchoolName: string
  customSchoolAddress: string
  customSchoolPhone: string
  customSchoolEmail: string
}

const getDraftStorageKey = (complaintId: number | string, type: string) =>
  `bk_letter_draft_${complaintId}_${type}`

const getOpeningText = (type: 'panggilan' | 'sp1' | 'sp2' | 'sp3', schoolName: string) => {
  switch (type) {
    case 'sp1':
      return `Sehubungan dengan penegakan tata tertib dan pembinaan kedisiplinan siswa di ${schoolName}, bersama ini kami menerbitkan Surat Peringatan Pertama (SP-1) sebagai bentuk pembinaan dan pemberitahuan resmi kepada orang tua/wali murid atas catatan pelanggaran berikut:`
    case 'sp2':
      return `Menindaklanjuti catatan pelanggaran tata tertib yang berulang dan sebagai langkah pembinaan lanjutan di ${schoolName}, bersama ini kami menerbitkan Surat Peringatan Kedua (SP-2) agar orang tua/wali murid turut mendampingi proses pembinaan siswa dengan rincian sebagai berikut:`
    case 'sp3':
      return `Mengingat tingginya akumulasi pelanggaran tata tertib di ${schoolName}, bersama ini kami menerbitkan Surat Peringatan Ketiga / Terakhir (SP-3) dan mengharapkan kehadiran orang tua/wali murid untuk penyelesaian serta penandatanganan pernyataan pembinaan akhir atas catatan berikut:`
    default:
      return `Sehubungan dengan komitmen bersama dalam pembinaan kedisiplinan dan keberhasilan belajar siswa di ${schoolName}, melalui surat ini kami menginformasikan catatan bimbingan konseling dan ketertiban siswa sebagai berikut:`
  }
}

export function OfficialLetterModal({ isOpen, onClose, complaintId }: OfficialLetterModalProps) {
  const [letterType, setLetterType] = useState<'panggilan' | 'sp1' | 'sp2' | 'sp3'>('panggilan')
  const [letterData, setLetterData] = useState<OfficialLetterData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [copied, setCopied] = useState(false)

  // Toggle Edit Panel & Active Tab
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(true)
  const [activeEditTab, setActiveEditTab] = useState<'ttd' | 'jadwal' | 'surat'>('ttd')
  const [hasEditedSharedFields, setHasEditedSharedFields] = useState(false)

  // Editable Form States
  const [customGuruBkName, setCustomGuruBkName] = useState('')
  const [customGuruBkNip, setCustomGuruBkNip] = useState('')
  const [customGuruBkTitle, setCustomGuruBkTitle] = useState('')
  const [customCounselor, setCustomCounselor] = useState('')

  const [customKepsekName, setCustomKepsekName] = useState('')
  const [customKepsekNip, setCustomKepsekNip] = useState('')
  const [customKepsekTitle, setCustomKepsekTitle] = useState('')

  const [includeWaliKelasTtd, setIncludeWaliKelasTtd] = useState(false)
  const [customWaliKelasName, setCustomWaliKelasName] = useState('')
  const [customWaliKelasNip, setCustomWaliKelasNip] = useState('')

  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('')
  const [customScheduleRoom, setCustomScheduleRoom] = useState('')

  const [customLetterNumber, setCustomLetterNumber] = useState('')
  const [customLetterTitle, setCustomLetterTitle] = useState('')
  const [customIssuedPlaceDate, setCustomIssuedPlaceDate] = useState('')
  const [customChronology, setCustomChronology] = useState('')

  // Editable School Header (Kop Surat)
  const [customSchoolName, setCustomSchoolName] = useState('')
  const [customSchoolAddress, setCustomSchoolAddress] = useState('')
  const [customSchoolPhone, setCustomSchoolPhone] = useState('')
  const [customSchoolEmail, setCustomSchoolEmail] = useState('')

  const applyServerDefaults = useCallback((data: OfficialLetterData, keepSharedEdits = false) => {
    setCustomLetterNumber(data.letter_number)
    setCustomLetterTitle(data.letter_title)

    if (!keepSharedEdits) {
      const city = data.letter_city || 'Karawang'
      setCustomScheduleDate(data.schedule.date_text)
      setCustomScheduleTime(data.schedule.time)
      setCustomScheduleRoom(data.schedule.room)
      setCustomCounselor(data.schedule.counselor)

      setCustomGuruBkName(data.signatories.guru_bk.name)
      setCustomGuruBkNip(data.signatories.guru_bk.nip)
      setCustomGuruBkTitle(data.signatories.guru_bk.title)

      setCustomKepsekName(data.signatories.kepala_sekolah.name)
      setCustomKepsekNip(data.signatories.kepala_sekolah.nip)
      setCustomKepsekTitle(data.signatories.kepala_sekolah.title)

      setCustomWaliKelasName(data.student.wali_kelas || '')
      setCustomWaliKelasNip('NIP. -')

      setCustomIssuedPlaceDate(`${city}, ${data.issued_date}`)
      setCustomChronology(data.complaint.chronology || '')

      setCustomSchoolName(data.school.name)
      setCustomSchoolAddress(data.school.address)
      setCustomSchoolPhone(data.school.phone)
      setCustomSchoolEmail(data.school.email)
    }
  }, [])

  const applySavedDraft = useCallback((draft: SavedLetterDraft) => {
    setCustomGuruBkName(draft.customGuruBkName)
    setCustomGuruBkNip(draft.customGuruBkNip)
    setCustomGuruBkTitle(draft.customGuruBkTitle)
    setCustomCounselor(draft.customCounselor)
    setCustomKepsekName(draft.customKepsekName)
    setCustomKepsekNip(draft.customKepsekNip)
    setCustomKepsekTitle(draft.customKepsekTitle)
    setIncludeWaliKelasTtd(draft.includeWaliKelasTtd)
    setCustomWaliKelasName(draft.customWaliKelasName)
    setCustomWaliKelasNip(draft.customWaliKelasNip)
    setCustomScheduleDate(draft.customScheduleDate)
    setCustomScheduleTime(draft.customScheduleTime)
    setCustomScheduleRoom(draft.customScheduleRoom)
    setCustomLetterNumber(draft.customLetterNumber)
    setCustomLetterTitle(draft.customLetterTitle)
    setCustomIssuedPlaceDate(draft.customIssuedPlaceDate)
    setCustomChronology(draft.customChronology)
    setCustomSchoolName(draft.customSchoolName)
    setCustomSchoolAddress(draft.customSchoolAddress)
    setCustomSchoolPhone(draft.customSchoolPhone)
    setCustomSchoolEmail(draft.customSchoolEmail)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setHasEditedSharedFields(false)
      setHasUnsavedChanges(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !complaintId) return

    setIsLoading(true)
    complaintService
      .getOfficialLetter(complaintId, letterType)
      .then((res) => {
        if (res.success && res.data) {
          setLetterData(res.data)

          // Check if there is a saved draft for this complaint & letter type
          const rawDraft = localStorage.getItem(getDraftStorageKey(complaintId, letterType))
          if (rawDraft && !hasEditedSharedFields) {
            try {
              const parsed = JSON.parse(rawDraft) as SavedLetterDraft
              applySavedDraft(parsed)
              setHasUnsavedChanges(false)
              return
            } catch {
              // ignore invalid JSON draft
            }
          }

          applyServerDefaults(res.data, hasEditedSharedFields)
        }
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat data surat resmi.', 'error')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, complaintId, letterType, hasEditedSharedFields, applySavedDraft, applyServerDefaults])

  if (!isOpen) return null

  const markEdited = (shared = true) => {
    setHasUnsavedChanges(true)
    if (shared) {
      setHasEditedSharedFields(true)
    }
  }

  const handleSaveChanges = async () => {
    if (!complaintId) return
    setIsSaving(true)

    const draft: SavedLetterDraft = {
      customGuruBkName,
      customGuruBkNip,
      customGuruBkTitle,
      customCounselor,
      customKepsekName,
      customKepsekNip,
      customKepsekTitle,
      includeWaliKelasTtd,
      customWaliKelasName,
      customWaliKelasNip,
      customScheduleDate,
      customScheduleTime,
      customScheduleRoom,
      customLetterNumber,
      customLetterTitle,
      customIssuedPlaceDate,
      customChronology,
      customSchoolName,
      customSchoolAddress,
      customSchoolPhone,
      customSchoolEmail,
    }

    try {
      localStorage.setItem(getDraftStorageKey(complaintId, letterType), JSON.stringify(draft))

      const cityPart = customIssuedPlaceDate.includes(',')
        ? customIssuedPlaceDate.split(',')[0].trim()
        : 'Karawang'

      await complaintService.saveLetterDefaults({
        letter_kepsek_name: customKepsekName.trim(),
        letter_kepsek_nip: customKepsekNip.trim(),
        letter_kepsek_title: customKepsekTitle.trim(),
        letter_gurubk_name: customGuruBkName.trim(),
        letter_gurubk_nip: customGuruBkNip.trim(),
        letter_gurubk_title: customGuruBkTitle.trim(),
        letter_counselor: customCounselor.trim(),
        letter_room: customScheduleRoom.trim(),
        letter_time: customScheduleTime.trim(),
        letter_city: cityPart,
      })

      setHasUnsavedChanges(false)
      showToast('Perubahan naskah & penandatangan surat berhasil disimpan!', 'success')
    } catch (err: any) {
      // Even if server default save fails, local draft is still saved
      setHasUnsavedChanges(false)
      showToast(
        err?.message || 'Draft surat disimpan lokal, tetapi gagal menyinkronkan default ke server.',
        'warning',
        err?.request_id
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyNumber = () => {
    const num = customLetterNumber || letterData?.letter_number
    if (num) {
      navigator.clipboard.writeText(num)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleResetToDefault = () => {
    localStorage.removeItem(getDraftStorageKey(complaintId, letterType))
    setHasEditedSharedFields(false)
    setHasUnsavedChanges(false)
    if (letterData) {
      applyServerDefaults(letterData, false)
      setIncludeWaliKelasTtd(false)
      showToast('Data naskah dan tanda tangan dikembalikan ke data awal sistem.', 'info')
    }
  }

  const displaySchoolName = customSchoolName || letterData?.school.name || 'SMK IPTEK SANGGABUANA'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div
        id="official-letter-modal-shell"
        className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-4 flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none"
      >
        {/* Modal Header & Controls (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-navy-100 text-navy-800 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Editor & Cetak Surat Resmi BK
                </h2>
                {hasUnsavedChanges && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Belum Disimpan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">
                {customLetterNumber || letterData?.letter_number || 'Memuat nomor surat...'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditPanelOpen(!isEditPanelOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                isEditPanelOpen
                  ? 'bg-navy-50 text-navy-900 border-navy-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditPanelOpen ? 'Tutup Panel Edit' : 'Buka Panel Edit'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isLoading || isSaving || !letterData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !letterData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-800 hover:bg-navy-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Tutup modal surat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Letter Type Switcher Toolbar (Hidden in Print) */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLetterType('panggilan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                letterType === 'panggilan'
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Surat Panggilan Orang Tua
            </button>
            <button
              type="button"
              onClick={() => setLetterType('sp1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                letterType === 'sp1'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peringatan I (SP-1)
            </button>
            <button
              type="button"
              onClick={() => setLetterType('sp2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                letterType === 'sp2'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peringatan II (SP-2)
            </button>
            <button
              type="button"
              onClick={() => setLetterType('sp3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                letterType === 'sp3'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peringatan III (SP-3)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyNumber}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Nomor'}
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Kembalikan semua teks ke data asli sistem"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Main Body: Side-by-side Editor + Live Preview on Desktop */}
        <div
          className={`flex-1 min-h-0 grid grid-cols-1 ${
            isEditPanelOpen ? 'lg:grid-cols-12' : ''
          } overflow-hidden print:block print:overflow-visible`}
        >
          {/* Left Side: Edit Panel (Hidden in Print) */}
          {isEditPanelOpen && (
            <div className="lg:col-span-5 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0 max-h-[42vh] lg:max-h-none overflow-y-auto p-4 space-y-3 print:hidden">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-navy-900">
                  Edit Naskah Surat (Pratinjau Langsung)
                </p>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>

              {/* Edit Sub-tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveEditTab('ttd')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeEditTab === 'ttd'
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  Penandatangan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('jadwal')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeEditTab === 'jadwal'
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  Jadwal & Ruang
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('surat')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeEditTab === 'surat'
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  Kop & Redaksi
                </button>
              </div>

              {/* Sub-tab 1: Tanda Tangan */}
              {activeEditTab === 'ttd' && (
                <div className="space-y-3 text-xs">
                  {/* Guru BK */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                      <User className="w-3.5 h-3.5 text-navy-600" />
                      <span>Penandatangan Guru BK</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Nama Guru BK
                      </label>
                      <input
                        type="text"
                        value={customGuruBkName}
                        onChange={(e) => {
                          setCustomGuruBkName(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                        placeholder="Nama lengkap & gelar guru BK"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          NIP / NUPTK
                        </label>
                        <input
                          type="text"
                          value={customGuruBkNip}
                          onChange={(e) => {
                            setCustomGuruBkNip(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="NIP. ..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Jabatan
                        </label>
                        <input
                          type="text"
                          value={customGuruBkTitle}
                          onChange={(e) => {
                            setCustomGuruBkTitle(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="Koordinator Guru BK"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Guru yang Ditemui Ortu (Menemui)
                      </label>
                      <input
                        type="text"
                        value={customCounselor}
                        onChange={(e) => {
                          setCustomCounselor(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                        placeholder="Nama guru yang ditemui orang tua"
                      />
                    </div>
                  </div>

                  {/* Kepala Sekolah */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-navy-600" />
                      <span>Penandatangan Mengetahui (Kepala Sekolah)</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Nama Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        value={customKepsekName}
                        onChange={(e) => {
                          setCustomKepsekName(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                        placeholder="Drs. H. Mulyadi, M.Pd."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          NIP Kepala Sekolah
                        </label>
                        <input
                          type="text"
                          value={customKepsekNip}
                          onChange={(e) => {
                            setCustomKepsekNip(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="NIP. ..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Jabatan
                        </label>
                        <input
                          type="text"
                          value={customKepsekTitle}
                          onChange={(e) => {
                            setCustomKepsekTitle(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="Kepala Sekolah"
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={includeWaliKelasTtd}
                        onChange={(e) => {
                          setIncludeWaliKelasTtd(e.target.checked)
                          markEdited(true)
                        }}
                        className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                      />
                      <span className="text-xs text-slate-700 font-semibold">
                        Sertakan Kolom TTD Wali Kelas
                      </span>
                    </label>
                  </div>

                  {/* Wali Kelas Fields */}
                  {includeWaliKelasTtd && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Nama Wali Kelas
                        </label>
                        <input
                          type="text"
                          value={customWaliKelasName}
                          onChange={(e) => {
                            setCustomWaliKelasName(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="Nama Wali Kelas"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          NIP Wali Kelas
                        </label>
                        <input
                          type="text"
                          value={customWaliKelasNip}
                          onChange={(e) => {
                            setCustomWaliKelasNip(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                          placeholder="NIP. -"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Jadwal & Ruangan */}
              {activeEditTab === 'jadwal' && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Hari & Tanggal Menghadap
                    </label>
                    <input
                      type="text"
                      value={customScheduleDate}
                      onChange={(e) => {
                        setCustomScheduleDate(e.target.value)
                        markEdited(true)
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      placeholder="Rabu, 21 Oktober 2026"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Waktu / Pukul
                    </label>
                    <input
                      type="text"
                      value={customScheduleTime}
                      onChange={(e) => {
                        setCustomScheduleTime(e.target.value)
                        markEdited(true)
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      placeholder="09.00 - 11.30 WIB"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Ruangan / Tempat
                    </label>
                    <input
                      type="text"
                      value={customScheduleRoom}
                      onChange={(e) => {
                        setCustomScheduleRoom(e.target.value)
                        markEdited(true)
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      placeholder="Ruang BK Lt. 2"
                    />
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Kop Surat, Nomor & Redaksi */}
              {activeEditTab === 'surat' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                      <FileText className="w-3.5 h-3.5 text-navy-600" />
                      <span>Nomor, Perihal & Kronologi</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Nomor Surat
                      </label>
                      <input
                        type="text"
                        value={customLetterNumber}
                        onChange={(e) => {
                          setCustomLetterNumber(e.target.value)
                          markEdited(false)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Kota & Tanggal Surat
                      </label>
                      <input
                        type="text"
                        value={customIssuedPlaceDate}
                        onChange={(e) => {
                          setCustomIssuedPlaceDate(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Perihal / Judul Surat
                      </label>
                      <input
                        type="text"
                        value={customLetterTitle}
                        onChange={(e) => {
                          setCustomLetterTitle(e.target.value)
                          markEdited(false)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Kronologi / Catatan Khusus di Surat
                      </label>
                      <textarea
                        rows={3}
                        value={customChronology}
                        onChange={(e) => {
                          setCustomChronology(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                      <Building2 className="w-3.5 h-3.5 text-navy-600" />
                      <span>Kop Surat Sekolah</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Nama Sekolah
                      </label>
                      <input
                        type="text"
                        value={customSchoolName}
                        onChange={(e) => {
                          setCustomSchoolName(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Alamat Sekolah
                      </label>
                      <input
                        type="text"
                        value={customSchoolAddress}
                        onChange={(e) => {
                          setCustomSchoolAddress(e.target.value)
                          markEdited(true)
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Telepon
                        </label>
                        <input
                          type="text"
                          value={customSchoolPhone}
                          onChange={(e) => {
                            setCustomSchoolPhone(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Email
                        </label>
                        <input
                          type="text"
                          value={customSchoolEmail}
                          onChange={(e) => {
                            setCustomSchoolEmail(e.target.value)
                            markEdited(true)
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-navy-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isLoading || isSaving || !letterData}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Surat'}
                </button>
              </div>
            </div>
          )}

          {/* Right Side: Printable Official Document Body */}
          <div
            id="official-letter-print-area"
            className={`${
              isEditPanelOpen ? 'lg:col-span-7' : 'col-span-1'
            } p-6 sm:p-10 font-serif text-slate-900 bg-white overflow-y-auto min-h-0 print:overflow-visible print:p-0`}
          >
            {isLoading || !letterData ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mb-3 text-navy-600" />
                <p className="text-sm font-sans">Menyusun naskah surat resmi sekolah...</p>
              </div>
            ) : (
              <div className="space-y-5 text-sm leading-relaxed max-w-3xl mx-auto">
                {/* 1. KOP SURAT RESMI */}
                <div className="text-center pb-4 border-b-4 border-slate-900 relative">
                  <div className="border-b border-slate-900 pb-1 mb-1">
                    <h4 className="text-xs uppercase font-bold tracking-widest text-slate-700 font-sans">
                      Yayasan Pendidikan Iptek Sanggabuana
                    </h4>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 font-sans">
                      {displaySchoolName}
                    </h2>
                    <p className="text-xs text-slate-600 font-sans">
                      NPSN: {letterData.school.npsn} | Status Akreditasi: {letterData.school.akreditasi}
                    </p>
                    <p className="text-xs text-slate-600 font-sans">
                      {customSchoolAddress} | Telp: {customSchoolPhone}
                    </p>
                    <p className="text-xs text-slate-500 font-sans">
                      Website: {letterData.school.website} | E-mail: {customSchoolEmail}
                    </p>
                  </div>
                </div>

                {/* 2. SURAT HEADER */}
                <div className="flex justify-between items-start text-xs font-sans gap-4">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-20 text-slate-500 shrink-0">Nomor</span>
                      <span className="font-semibold">: {customLetterNumber}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 text-slate-500 shrink-0">Lampiran</span>
                      <span>: 1 (Satu) Berkas Riwayat Kasus</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 text-slate-500 shrink-0">Perihal</span>
                      <span className="font-bold underline uppercase">: {customLetterTitle}</span>
                    </div>
                  </div>

                  <div className="text-right text-slate-700 shrink-0">
                    <p>{customIssuedPlaceDate}</p>
                    <p className="mt-2 text-slate-500">Kepada Yth.</p>
                    <p className="font-bold">Bapak / Ibu Orang Tua / Wali Murid</p>
                    <p>
                      dari Siswa: <span className="font-bold underline">{letterData.student.name}</span>
                    </p>
                    <p>di Tempat</p>
                  </div>
                </div>

                {/* 3. PEMBUKA */}
                <div className="pt-1 text-justify">
                  <p>Dengan hormat,</p>
                  <p className="mt-2">{getOpeningText(letterType, displaySchoolName)}</p>
                </div>

                {/* 4. IDENTITAS SISWA & RINGKASAN */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs font-sans space-y-1.5">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Nama Lengkap Siswa</span>
                    <span className="col-span-2 font-bold text-slate-900">: {letterData.student.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Nomor Induk Siswa (NIS/NISN)</span>
                    <span className="col-span-2 font-mono">
                      : {letterData.student.nis} / {letterData.student.nisn}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Kelas / Rombel</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      : {letterData.student.class_name} (Wali Kelas: {customWaliKelasName || '-'})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Total Akumulasi Poin Pelanggaran</span>
                    <span className="col-span-2 font-bold text-rose-600">
                      : {letterData.student.cumulative_points} Poin (Batas Pembinaan)
                    </span>
                  </div>
                </div>

                {/* 5. RINCIAN INSIDEN / PELANGGARAN */}
                <div className="text-xs font-sans space-y-2">
                  <p className="font-serif text-sm">
                    Adapun rincian peristiwa/pelanggaran yang tercatat pada sistem bimbingan konseling:
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-8">No</th>
                          <th className="p-2">Kategori Pelanggaran / Masalah</th>
                          <th className="p-2 text-center w-24">Bobot Poin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {letterData.complaint.violations.length > 0 ? (
                          letterData.complaint.violations.map((v, idx) => (
                            <tr key={idx}>
                              <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                              <td className="p-2 font-medium">{v.name}</td>
                              <td className="p-2 text-center font-bold text-rose-600">{v.points} Pts</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-2 text-slate-500 italic">
                              Catatan pembinaan kedisiplinan dan absensi berkala.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {customChronology.trim() !== '' && (
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-slate-700 italic whitespace-pre-wrap">
                      <strong>Kronologi Singkat:</strong> "{customChronology}"
                    </div>
                  )}
                </div>

                {/* 6. JADWAL PANGGILAN KONSULTASI */}
                <div className="text-justify">
                  <p>
                    Mengingat pentingnya pendampingan bersama demi masa depan ananda, kami mengharapkan kehadiran
                    Bapak / Ibu Orang Tua / Wali Murid di sekolah pada:
                  </p>
                  <div className="my-3 pl-6 space-y-1 font-sans text-xs">
                    <div className="flex gap-3">
                      <span className="w-32 font-semibold text-slate-600">Hari / Tanggal</span>
                      <span>
                        : <strong>{customScheduleDate}</strong>
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-32 font-semibold text-slate-600">Waktu / Pukul</span>
                      <span>: {customScheduleTime}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-32 font-semibold text-slate-600">Tempat</span>
                      <span>: {customScheduleRoom}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-32 font-semibold text-slate-600">Menemui</span>
                      <span>: {customCounselor}</span>
                    </div>
                  </div>
                  <p>
                    Demikian surat ini kami sampaikan. Atas perhatian, kerja sama, dan kehadiran Bapak / Ibu demi
                    kemajuan dan pembinaan putra/putri kita, kami ucapkan terima kasih.
                  </p>
                </div>

                {/* 7. AREA TANDA TANGAN RESMI */}
                <div
                  className={`pt-8 grid ${
                    includeWaliKelasTtd ? 'grid-cols-4' : 'grid-cols-3'
                  } items-end text-xs font-sans text-center gap-3`}
                >
                  {/* Kolom 1: Kepala Sekolah */}
                  <div className="space-y-16">
                    <div>
                      <p className="text-slate-600">Mengetahui,</p>
                      <p className="font-bold">{customKepsekTitle}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-900">{customKepsekName}</p>
                      <p className="text-slate-500 text-[11px]">{customKepsekNip}</p>
                    </div>
                  </div>

                  {/* Kolom 2: Wali Kelas (Opsional) */}
                  {includeWaliKelasTtd && (
                    <div className="space-y-16">
                      <div>
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold">Wali Kelas</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-slate-900">{customWaliKelasName || '-'}</p>
                        <p className="text-slate-500 text-[11px]">{customWaliKelasNip || 'NIP. -'}</p>
                      </div>
                    </div>
                  )}

                  {/* Kolom QR Code Verifikasi */}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <QRCodeSVG
                      value={`VERIFIED-DOC: ${displaySchoolName} - ${letterData.complaint.code} - ${customLetterNumber}`}
                      size={76}
                      level="M"
                      className="border border-slate-200 p-1 bg-white rounded shadow-xs"
                    />
                    <p className="text-[10px] text-slate-400 font-mono">Verifikasi Dokumen</p>
                    <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> SAH & TERDAFTAR
                    </p>
                  </div>

                  {/* Kolom Kanan: Guru BK */}
                  <div className="space-y-16">
                    <div>
                      <p className="text-slate-600">{customIssuedPlaceDate}</p>
                      <p className="font-bold">{customGuruBkTitle}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-900">{customGuruBkName}</p>
                      <p className="text-slate-500 text-[11px]">{customGuruBkNip}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Note (Hidden in Print) */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0 print:hidden">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Edit di panel kiri langsung memperbarui pratinjau surat di kanan. Klik <strong>Simpan Perubahan</strong> agar tersimpan permanen.
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
