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
} from 'lucide-react'
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

  // Editable schedule states
  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('')
  const [customScheduleRoom, setCustomScheduleRoom] = useState('')

  useEffect(() => {
    if (!isOpen || !complaintId) return

    setIsLoading(true)
    complaintService
      .getOfficialLetter(complaintId, letterType)
      .then((res) => {
        if (res.success && res.data) {
          setLetterData(res.data)
          setCustomScheduleDate(res.data.schedule.date_text)
          setCustomScheduleTime(res.data.schedule.time)
          setCustomScheduleRoom(res.data.schedule.room)
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
    if (letterData?.letter_number) {
      navigator.clipboard.writeText(letterData.letter_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
                {letterData?.letter_number || 'Memuat nomor surat...'}
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

        {/* Toolbar: Switch Letter Type & Schedule Adjustment (Hidden in Print) */}
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

            <button
              onClick={handleCopyNumber}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Nomor Surat'}
            </button>
          </div>

          {/* Quick Schedule Inline Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div>
              <label className="text-slate-500 font-medium block mb-1">Hari & Tanggal Menghadap</label>
              <input
                type="text"
                value={customScheduleDate}
                onChange={(e) => setCustomScheduleDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-navy-600"
                placeholder="Rabu, 21 Oktober 2026"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Waktu / Pukul</label>
              <input
                type="text"
                value={customScheduleTime}
                onChange={(e) => setCustomScheduleTime(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-navy-600"
                placeholder="09.00 - 11.00 WIB"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Ruangan / Tempat</label>
              <input
                type="text"
                value={customScheduleRoom}
                onChange={(e) => setCustomScheduleRoom(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-navy-600"
                placeholder="Ruang BK Lt. 2"
              />
            </div>
          </div>
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
                    <span className="font-semibold">: {letterData.letter_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-20 text-slate-500">Lampiran</span>
                    <span>: 1 (Satu) Berkas Riwayat Kasus</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-20 text-slate-500">Perihal</span>
                    <span className="font-bold underline uppercase">
                      : {letterData.letter_title}
                    </span>
                  </div>
                </div>

                <div className="text-right text-slate-700">
                  <p>Karawang, {letterData.issued_date}</p>
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
                  <span className="col-span-2 font-semibold text-slate-800">: {letterData.student.class_name} (Wali Kelas: {letterData.student.wali_kelas})</span>
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
                  <strong>Kronologi Singkat:</strong> "{letterData.complaint.chronology}"
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
                    <span>: {letterData.schedule.counselor}</span>
                  </div>
                </div>
                <p>
                  Demikian surat ini kami sampaikan. Atas perhatian, kerja sama, dan kehadiran Bapak / Ibu demi 
                  kemajuan dan pembinaan putra/putri kita, kami ucapkan terima kasih.
                </p>
              </div>

              {/* 7. TANDA TANGAN DUA KOLOM + QR CODE RESMI */}
              <div className="pt-8 grid grid-cols-3 items-end text-xs font-sans text-center">
                {/* Kolom Kiri: Kepala Sekolah */}
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold">{letterData.signatories.kepala_sekolah.title}</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{letterData.signatories.kepala_sekolah.name}</p>
                    <p className="text-slate-500 text-[11px]">{letterData.signatories.kepala_sekolah.nip}</p>
                  </div>
                </div>

                {/* Kolom Tengah: QR Code Verifikasi Keaslian */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <img
                    src={letterData.qr_verification}
                    alt="QR Dokumen Resmi"
                    className="w-20 h-20 border border-slate-200 p-1 bg-white rounded shadow-xs"
                  />
                  <p className="text-[10px] text-slate-400 font-mono">Verifikasi Dokumen</p>
                  <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> SAH & TERDAFTAR
                  </p>
                </div>

                {/* Kolom Kanan: Guru BK */}
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-600">Karawang, {letterData.issued_date}</p>
                    <p className="font-bold">{letterData.signatories.guru_bk.title}</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{letterData.signatories.guru_bk.name}</p>
                    <p className="text-slate-500 text-[11px]">{letterData.signatories.guru_bk.nip}</p>
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
