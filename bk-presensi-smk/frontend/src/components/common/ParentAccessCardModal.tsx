import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Printer,
  ShieldCheck,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { studentService } from '../../services/studentService'
import { ParentVerificationData } from '../../types'
import { showToast } from '../../hooks/useToast'

interface ParentAccessCardModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: number | string
  studentName?: string
}

export function ParentAccessCardModal({
  isOpen,
  onClose,
  studentId,
  studentName,
}: ParentAccessCardModalProps) {
  const [data, setData] = useState<ParentVerificationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const loadData = () => {
    if (!studentId) return
    setIsLoading(true)
    studentService
      .getVerificationCode(studentId)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data)
        }
      })
      .catch((err) => {
        showToast(err.message || 'Gagal mengambil data akses Telegram wali.', 'error')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, studentId])

  if (!isOpen) return null

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const res = await studentService.generateVerificationCode(studentId)
      if (res.success && res.data) {
        setData(res.data)
        showToast('Kode verifikasi baru berhasil diterbitkan.', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui kode verifikasi.', 'error')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCopyCode = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleCopyLink = () => {
    if (data?.deep_link) {
      navigator.clipboard.writeText(data.deep_link)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        
        {/* Modal Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Kartu Akses Telegram Orang Tua / Wali
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {studentName || data?.student_name || `Siswa ID ${studentId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              disabled={isLoading || !data}
              className="p-2 text-slate-600 hover:text-navy-700 rounded-lg hover:bg-slate-200 transition-colors"
              title="Cetak Slip Kartu Akses"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {isLoading || !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-2 text-sky-600" />
              <p className="text-xs">Menyiapkan kartu akses orang tua...</p>
            </div>
          ) : (
            <>
              {/* Slip Cetak Kartu Akses (Formatted nicely for display & print) */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 relative space-y-4 print:border-solid print:border-slate-800 print:bg-white print:p-6">
                
                {/* Header Slip */}
                <div className="flex items-center justify-between border-b border-sky-200 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm tracking-wide uppercase">
                      SMK IPTEK SANGGABUANA
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Slip Verifikasi Pemantauan Siswa via Bot Telegram
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-white text-sky-700 text-[10px] font-bold rounded-full border border-sky-200 flex items-center gap-1 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-sky-600" /> RESMI & AMAN
                  </span>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Nama Siswa</span>
                    <strong className="text-slate-800 text-sm">{data.student_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">NIS / Rombel</span>
                    <span className="font-mono text-slate-700 font-bold">{data.nis}</span> • <span>{data.class_name}</span>
                  </div>
                </div>

                {/* QR Code + Fast Connect Link */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-sky-100 shadow-xs">
                  <div className="flex flex-col items-center">
                    <img
                      src={data.qr_link}
                      alt="QR Tautan Telegram"
                      className="w-32 h-32 border border-slate-200 rounded-lg p-1 bg-white"
                    />
                    <span className="text-[10px] text-slate-500 font-medium mt-1">Scan Kamera HP</span>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs text-center sm:text-left">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">
                        Cara Cepat: Scan QR atau Buka Link
                      </span>
                      <p className="text-[11px] text-slate-700">
                        Arahkan kamera ponsel orang tua ke QR di samping untuk langsung terhubung tanpa repot mengetik.
                      </p>
                    </div>

                    {/* Verification Code Box */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-semibold">
                          Kode Verifikasi Mandiri
                        </span>
                        <span className="font-mono text-lg font-black tracking-widest text-navy-800">
                          {data.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors print:hidden"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedCode ? 'Disalin' : 'Salin'}
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      Berlaku sampai: <strong>{data.expires_at_formatted}</strong>
                    </div>
                  </div>
                </div>

                {/* Step Instructions */}
                <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Petunjuk Untuk Orang Tua / Wali Murid:</p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                    <li>Scan QR Code dengan kamera ponsel Anda atau buka tautan di bawah.</li>
                    <li>Tekan tombol <strong>Start / Mulai</strong> di Telegram.</li>
                    <li>
                      Jika input manual, kirim pesan: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-900">{data.manual_command}</code>
                    </li>
                  </ol>
                </div>

              </div>

              {/* Action Buttons & Links (Hidden in Print) */}
              <div className="space-y-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={data.deep_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Langsung di Telegram
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Tautan Disalin' : 'Salin Tautan'}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Terbitkan Kode Baru
                  </button>
                </div>

                {/* Connected Parents Status */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Status Koneksi Wali Murid:
                    </span>
                    {data.is_connected ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Terhubung ({data.parents.length})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Belum Ada Wali Terhubung
                      </span>
                    )}
                  </div>

                  {data.parents.length > 0 && (
                    <div className="divide-y divide-slate-200/60 pt-1">
                      {data.parents.map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{p.parent_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">(ID: {p.telegram_id})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Terverifikasi: {p.verified_at || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <button
            onClick={handlePrint}
            disabled={isLoading || !data}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-navy-700"
          >
            <Printer className="w-4 h-4" /> Cetak Slip Lembar Wali
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  )
}
