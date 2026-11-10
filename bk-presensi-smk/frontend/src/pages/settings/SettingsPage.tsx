import React, { useState, useEffect } from 'react'
import {
  Settings,
  Phone,
  Clock,
  Calendar,
  Building,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'

export function SettingsPage() {
  const { settings, isLoading, updateSchoolSettings, refreshSettings } = useSchoolSettings()

  // Settings Form State
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [bkPhone, setBkPhone] = useState('')
  const [bkEmail, setBkEmail] = useState('')
  const [cutoffTime, setCutoffTime] = useState('')
  const [activeAcademicYear, setActiveAcademicYear] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setSchoolName(settings.school_name || 'SMK IPTEK SANGGABUANA')
      setSchoolAddress(settings.school_address || '')
      setBkPhone(settings.school_phone || '')
      setBkEmail(settings.school_email || '')
      setCutoffTime(settings.cutoff_time || '08:00')
      setActiveAcademicYear(settings.active_academic_year || '2026/2027')
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    await updateSchoolSettings({
      school_name: schoolName.trim(),
      school_address: schoolAddress.trim(),
      school_phone: bkPhone.trim(),
      school_email: bkEmail.trim(),
      cutoff_time: cutoffTime,
      active_academic_year: activeAcademicYear.trim(),
    })

    setIsSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Pengaturan Sistem & Sekolah"
        description={`Konfigurasi nama institusi sekolah, parameter akademik, dan kontak resmi ${settings.school_name || 'Sekolah'}`}
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* School Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-navy-700" />
              <span>Informasi Institusi Sekolah</span>
            </div>
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-navy-600 font-normal">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Memuat data...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nama Sekolah / Institusi"
              required
              hint="Nama sekolah akan otomatis tampil di Navbar, Sidebar, dan Halaman Login."
            >
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMK IPTEK SANGGABUANA"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600 font-medium"
              />
            </FormField>

            <FormField
              label="Tahun Ajaran Aktif"
              hint="Format standar akademik (cth: 2026/2027)"
            >
              <input
                type="text"
                value={activeAcademicYear}
                onChange={(e) => setActiveAcademicYear(e.target.value)}
                placeholder="2026/2027"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </FormField>
          </div>

          <FormField label="Alamat Lengkap Kampus / Sekolah">
            <input
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              placeholder="Alamat jalan, nomor, kecamatan, kota/kabupaten"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
            />
          </FormField>
        </div>

        {/* Counseling & Bot Telegram Contacts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <Phone className="w-4 h-4 text-navy-700" />
            Kontak Resmi Bimbingan Konseling (Ditampilkan di Bot Telegram)
          </div>
          <p className="text-xs text-slate-500">
            Kontak ini dikirimkan otomatis kepada orang tua murid saat menjalankan perintah /bantuan atau tombol Hubungi BK.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nomor WhatsApp / Telepon BK" required>
              <input
                type="text"
                required
                value={bkPhone}
                onChange={(e) => setBkPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </FormField>

            <FormField label="Email Resmi BK" required>
              <input
                type="email"
                required
                value={bkEmail}
                onChange={(e) => setBkEmail(e.target.value)}
                placeholder="bk@sekolah.sch.id"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </FormField>
          </div>
        </div>

        {/* Attendance Cutoff Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <Clock className="w-4 h-4 text-navy-700" />
            Aturan Batas Waktu Presensi
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Batas Jam Masuk (Cutoff Time)"
              hint="Siswa yang hadir setelah jam ini ditandai terlambat."
            >
              <input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </FormField>
          </div>
        </div>

        {/* Bot Token Security Note */}
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">Keamanan Kredensial & Rahasia Bot:</p>
            <p className="mt-0.5">
              Sesuai pedoman kepatuhan dan keamanan data, token Bot Telegram (TELEGRAM_BOT_TOKEN) dan Application Key tidak ditampilkan di antarmuka web dan disimpan terisolasi di file konfigurasi server environment.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
