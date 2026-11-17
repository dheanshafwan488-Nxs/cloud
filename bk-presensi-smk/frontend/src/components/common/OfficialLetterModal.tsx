import React, { useState, useEffect } from 'react'
import {
  X,
  Printer,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Edit3,
  User,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UserCheck,
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

export function OfficialLetterModal({ isOpen, onClose, complaintId }: OfficialLetterModalProps) {
  const [letterType, setLetterType] = useState<'panggilan' | 'sp1' | 'sp2' | 'sp3'>('panggilan')
  const [letterData, setLetterData] = useState<OfficialLetterData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Toggle Edit Panel & Active Tab
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(true)
  const [activeEditTab, setActiveEditTab] = useState<'ttd' | 'jadwal' | 'surat'>('ttd')

  // Editable Form States
  // 1. Tanda Tangan Guru BK & Konselor
  const [customGuruBkName, setCustomGuruBkName] = useState('')
  const [customGuruBkNip, setCustomGuruBkNip] = useState('')
  const [customGuruBkTitle, setCustomGuruBkTitle] = useState('')
  const [customCounselor, setCustomCounselor] = useState('')

  // 2. Tanda Tangan Kepala Sekolah
  const [customKepsekName, setCustomKepsekName] = useState('')
  const [customKepsekNip, setCustomKepsekNip] = useState('')
  const [customKepsekTitle, setCustomKepsekTitle] = useState('')

  // 3. Tanda Tangan Wali Kelas (Opsional)
  const [includeWaliKelasTtd, setIncludeWaliKelasTtd] = useState(false)
  const [customWaliKelasName, setCustomWaliKelasName] = useState('')
  const [customWaliKelasNip, setCustomWaliKelasNip] = useState('')

  // 4. Jadwal Panggilan
  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('')
  const [customScheduleRoom, setCustomScheduleRoom] = useState('')

  // 5. Informasi Dokumen & Redaksi
  const [customLetterNumber, setCustomLetterNumber] = useState('')
  const [customLetterTitle, setCustomLetterTitle] = useState('')
  const [customIssuedPlaceDate, setCustomIssuedPlaceDate] = useState('')
  const [customChronology, setCustomChronology] = useState('')

  const populateFields = (data: OfficialLetterData) => {
    // Schedule
    setCustomScheduleDate(data.schedule.date_text)
    setCustomScheduleTime(data.schedule.time)
    setCustomScheduleRoom(data.schedule.room)
    setCustomCounselor(data.schedule.counselor)

    // Signatures
    setCustomGuruBkName(data.signatories.guru_bk.name)
    setCustomGuruBkNip(data.signatories.guru_bk.nip)
    setCustomGuruBkTitle(data.signatories.guru_bk.title)

    setCustomKepsekName(data.signatories.kepala_sekolah.name)
    setCustomKepsekNip(data.signatories.kepala_sekolah.nip)
    setCustomKepsekTitle(data.signatories.kepala_sekolah.title)

    setCustomWaliKelasName(data.student.wali_kelas || '')
    setCustomWaliKelasNip('NIP. -')

    // Document Details
    setCustomLetterNumber(data.letter_number)
    setCustomLetterTitle(data.letter_title)
    setCustomIssuedPlaceDate(`Karawang, ${data.issued_date}`)
    setCustomChronology(data.complaint.chronology || '')
  }

  useEffect(() => {
    if (!isOpen || !complaintId) return

    setIsLoading(true)
    complaintService
      .getOfficialLetter(complaintId, letterType)
      .then((res) => {
        if (res.success && res.data) {
          setLetterData(res.data)
          populateFields(res.data)
        }
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat data surat resmi.', 'error')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, complaintId, letterType])

  if (!isOpen) return null

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
    if (letterData) {
      populateFields(letterData)
      setIncludeWaliKelasTtd(false)
      showToast('Data naskah dan tanda tangan dikembalikan ke data awal sistem.', 'info')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        
        {/* Modal Header & Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-100 text-navy-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Generator Surat Resmi Bimbingan Konseling
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {customLetterNumber || letterData?.letter_number || 'Memuat nomor surat...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !letterData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Switch Letter Type & Toggle Edit Panel (Hidden in Print) */}
        <div className="p-4 bg-white border-b border-slate-200 space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Letter Type Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setLetterType('panggilan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  letterType === 'panggilan'
                    ? 'bg-white text-navy-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Surat Panggilan Orang Tua
              </button>
              <button
                type="button"
                onClick={() => setLetterType('sp1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  letterType === 'sp3'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peringatan III (SP-3 / Terakhir)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyNumber}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin Nomor Surat'}
              </button>
            </div>
          </div>

          {/* Collapsible Edit Bar Header */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditPanelOpen(!isEditPanelOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-800 font-semibold text-xs rounded-lg transition-colors border border-navy-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditPanelOpen ? 'Sembunyikan Panel Edit' : 'Edit Nama Guru & Tanda Tangan'}</span>
                {isEditPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Perubahan langsung diterapkan ke naskah surat secara real-time.
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetToDefault}
              title="Kembalikan semua teks ke data asli sistem"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset ke Default</span>
            </button>
          </div>

          {/* Expanded Edit Panel */}
          {isEditPanelOpen && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              {/* Edit Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveEditTab('ttd')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeEditTab === 'ttd'
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  ✍️ Penandatangan (Guru BK & Kepsek)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('jadwal')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeEditTab === 'jadwal'
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  📅 Jadwal & Ruangan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('surat')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeEditTab === 'surat'
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  📋 Nomor Surat & Redaksi
                </button>
              </div>

              {/* Sub-tab 1: Tanda Tangan */}
              {activeEditTab === 'ttd' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Guru BK */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                        <User className="w-3.5 h-3.5 text-navy-600" />
                        <span>Penandatangan Guru BK</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nama Guru BK</label>
                        <input
                          type="text"
                          value={customGuruBkName}
                          onChange={(e) => setCustomGuruBkName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                          placeholder="Nama lengkap & gelar guru BK"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">NIP / NUPTK</label>
                          <input
                            type="text"
                            value={customGuruBkNip}
                            onChange={(e) => setCustomGuruBkNip(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                            placeholder="NIP. ..."
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Jabatan Tanda Tangan</label>
                          <input
                            type="text"
                            value={customGuruBkTitle}
                            onChange={(e) => setCustomGuruBkTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                            placeholder="Koordinator Guru BK"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Guru yang Ditemui Ortu (Menemui)</label>
                        <input
                          type="text"
                          value={customCounselor}
                          onChange={(e) => setCustomCounselor(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                          placeholder="Nama guru yang akan ditemui orang tua"
                        />
                      </div>
                    </div>

                    {/* Kepala Sekolah */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-navy-900 border-b border-slate-100 pb-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-navy-600" />
                        <span>Penandatangan Mengetahui (Kepala Sekolah)</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={customKepsekName}
                          onChange={(e) => setCustomKepsekName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                          placeholder="Drs. H. Mulyadi, M.Pd."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">NIP Kepala Sekolah</label>
                          <input
                            type="text"
                            value={customKepsekNip}
                            onChange={(e) => setCustomKepsekNip(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                            placeholder="NIP. ..."
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Jabatan Mengetahui</label>
                          <input
                            type="text"
                            value={customKepsekTitle}
                            onChange={(e) => setCustomKepsekTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                            placeholder="Kepala Sekolah"
                          />
                        </div>
                      </div>
                      <div className="pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeWaliKelasTtd}
                            onChange={(e) => setIncludeWaliKelasTtd(e.target.checked)}
                            className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                          />
                          <span className="text-xs text-slate-700 font-medium">
                            Sertakan Kolom TTD Wali Kelas di Surat
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Wali Kelas Fields if toggled */}
                  {includeWaliKelasTtd && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nama Wali Kelas</label>
                        <input
                          type="text"
                          value={customWaliKelasName}
                          onChange={(e) => setCustomWaliKelasName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                          placeholder="Nama Wali Kelas"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">NIP Wali Kelas</label>
                        <input
                          type="text"
                          value={customWaliKelasNip}
                          onChange={(e) => setCustomWaliKelasNip(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                          placeholder="NIP. ... (atau -)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Jadwal & Ruangan */}
              {activeEditTab === 'jadwal' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Hari & Tanggal Menghadap</label>
                    <input
                      type="text"
                      value={customScheduleDate}
                      onChange={(e) => setCustomScheduleDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                      placeholder="Rabu, 21 Oktober 2026"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Waktu / Pukul</label>
                    <input
                      type="text"
                      value={customScheduleTime}
                      onChange={(e) => setCustomScheduleTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                      placeholder="09.00 - 11.00 WIB"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Ruangan / Tempat</label>
                    <input
                      type="text"
                      value={customScheduleRoom}
                      onChange={(e) => setCustomScheduleRoom(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                      placeholder="Ruang BK Lt. 2"
                    />
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Administrasi & Redaksi */}
              {activeEditTab === 'surat' && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nomor Surat</label>
                      <input
                        type="text"
                        value={customLetterNumber}
                        onChange={(e) => setCustomLetterNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-mono focus:ring-1 focus:ring-navy-600"
                        placeholder="421.5/007/SMK-IPTEK/BK-PGL/XI/2026"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Kota & Tanggal Surat</label>
                      <input
                        type="text"
                        value={customIssuedPlaceDate}
                        onChange={(e) => setCustomIssuedPlaceDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                        placeholder="Karawang, 17 November 2026"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Perihal / Judul Surat</label>
                      <input
                        type="text"
                        value={customLetterTitle}
                        onChange={(e) => setCustomLetterTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                        placeholder="SURAT PANGGILAN ORANG TUA / WALI MURID"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Kronologi / Catatan Khusus di Surat</label>
                    <textarea
                      rows={2}
                      value={customChronology}
                      onChange={(e) => setCustomChronology(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-navy-600"
                      placeholder="Tuliskan catatan atau kronologi peristiwa..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 sm:p-12 font-serif text-slate-900 bg-white max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          {isLoading || !letterData ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-navy-600" />
              <p className="text-sm font-sans">Menyusun naskah surat resmi sekolah...</p>
            </div>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed max-w-3xl mx-auto">
              
              {/* 1. KOP SURAT RESMI */}
              <div className="text-center pb-4 border-b-4 border-slate-900 relative">
                <div className="border-b border-slate-900 pb-1 mb-1">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-slate-700 font-sans">
                    Yayasan Pendidikan Iptek Sanggabuana
                  </h4>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 font-sans">
                    {letterData.school.name}
                  </h2>
                  <p className="text-xs text-slate-600 font-sans">
                    NPSN: {letterData.school.npsn} | Status Akreditasi: {letterData.school.akreditasi}
                  </p>
                  <p className="text-xs text-slate-600 font-sans">
                    {letterData.school.address} | Telp: {letterData.school.phone}
                  </p>
                  <p className="text-xs text-slate-500 font-sans">
                    Website: {letterData.school.website} | E-mail: {letterData.school.email}
                  </p>
                </div>
              </div>

              {/* 2. SURAT HEADER (Nomor, Lampiran, Perihal, Tanggal) */}
              <div className="flex justify-between items-start text-xs font-sans">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="w-20 text-slate-500">Nomor</span>
                    <span className="font-semibold">: {customLetterNumber || letterData.letter_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-20 text-slate-500">Lampiran</span>
                    <span>: 1 (Satu) Berkas Riwayat Kasus</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-20 text-slate-500">Perihal</span>
                    <span className="font-bold underline uppercase">
                      : {customLetterTitle || letterData.letter_title}
                    </span>
                  </div>
                </div>

                <div className="text-right text-slate-700">
                  <p>{customIssuedPlaceDate || `Karawang, ${letterData.issued_date}`}</p>
                  <p className="mt-2 text-slate-500">Kepada Yth.</p>
                  <p className="font-bold">Bapak / Ibu Orang Tua / Wali Murid</p>
                  <p>dari Siswa: <span className="font-bold underline">{letterData.student.name}</span></p>
                  <p>di Tempat</p>
                </div>
              </div>

              {/* 3. PEMBUKA */}
              <div className="pt-2 text-justify">
                <p>Dengan hormat,</p>
                <p className="mt-2 text-indent-8">
                  Sehubungan dengan komitmen bersama dalam pembinaan kedisiplinan dan keberhasilan belajar siswa 
                  di <strong>{letterData.school.name}</strong>, melalui surat ini kami menginformasikan catatan 
                  bimbingan konseling dan ketertiban siswa sebagai berikut:
                </p>
              </div>

              {/* 4. IDENTITAS SISWA & RINGKASAN */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs font-sans space-y-1.5">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Nama Lengkap Siswa</span>
                  <span className="col-span-2 font-bold text-slate-900">: {letterData.student.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Nomor Induk Siswa (NIS/NISN)</span>
                  <span className="col-span-2 font-mono">: {letterData.student.nis} / {letterData.student.nisn}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Kelas / Rombel</span>
                  <span className="col-span-2 font-semibold text-slate-800">
                    : {letterData.student.class_name} (Wali Kelas: {customWaliKelasName || letterData.student.wali_kelas || '-'})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Total Akumulasi Poin Pelanggaran</span>
                  <span className="col-span-2 font-bold text-rose-600">: {letterData.student.cumulative_points} Poin (Batas Pembinaan)</span>
                </div>
              </div>

              {/* 5. RINCIAN INSIDEN / PELANGGARAN */}
              <div className="text-xs font-sans space-y-2">
                <p className="font-serif text-sm">Adapun rincian peristiwa/pelanggaran yang tercatat pada sistem bimbingan konseling:</p>
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

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-slate-700 italic">
                  <strong>Kronologi Singkat:</strong> "{customChronology !== '' ? customChronology : letterData.complaint.chronology}"
                </div>
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
                    <span>: <strong>{customScheduleDate || letterData.schedule.date_text}</strong></span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-32 font-semibold text-slate-600">Waktu / Pukul</span>
                    <span>: {customScheduleTime || letterData.schedule.time}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-32 font-semibold text-slate-600">Tempat</span>
                    <span>: {customScheduleRoom || letterData.schedule.room}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-32 font-semibold text-slate-600">Menemui</span>
                    <span>: {customCounselor || letterData.schedule.counselor}</span>
                  </div>
                </div>
                <p>
                  Demikian surat ini kami sampaikan. Atas perhatian, kerja sama, dan kehadiran Bapak / Ibu demi 
                  kemajuan dan pembinaan putra/putri kita, kami ucapkan terima kasih.
                </p>
              </div>

              {/* 7. AREA TANDA TANGAN RESMI (Dua atau Tiga Kolom) */}
              <div className={`pt-8 grid ${includeWaliKelasTtd ? 'grid-cols-4' : 'grid-cols-3'} items-end text-xs font-sans text-center gap-3`}>
                
                {/* Kolom 1: Kepala Sekolah */}
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold">{customKepsekTitle || letterData.signatories.kepala_sekolah.title}</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{customKepsekName || letterData.signatories.kepala_sekolah.name}</p>
                    <p className="text-slate-500 text-[11px]">{customKepsekNip || letterData.signatories.kepala_sekolah.nip}</p>
                  </div>
                </div>

                {/* Kolom 2: Wali Kelas (Jika Diaktifkan) */}
                {includeWaliKelasTtd && (
                  <div className="space-y-16">
                    <div>
                      <p className="text-slate-600">Mengetahui,</p>
                      <p className="font-bold">Wali Kelas</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-900">{customWaliKelasName || letterData.student.wali_kelas || '-'}</p>
                      <p className="text-slate-500 text-[11px]">{customWaliKelasNip || 'NIP. -'}</p>
                    </div>
                  </div>
                )}

                {/* Kolom QR Code Verifikasi Keaslian */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <QRCodeSVG
                    value={`VERIFIED-DOC: SMK IPTEK SANGGABUANA - ${letterData.complaint.code} - ${customLetterNumber || letterData.letter_number}`}
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
                    <p className="text-slate-600">{customIssuedPlaceDate || `Karawang, ${letterData.issued_date}`}</p>
                    <p className="font-bold">{customGuruBkTitle || letterData.signatories.guru_bk.title}</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{customGuruBkName || letterData.signatories.guru_bk.name}</p>
                    <p className="text-slate-500 text-[11px]">{customGuruBkNip || letterData.signatories.guru_bk.nip}</p>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between print:hidden">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Dokumen ini di-generate otomatis sesuai standar tata kelola Bimbingan Konseling SMK IPTEK.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs rounded-lg hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}
