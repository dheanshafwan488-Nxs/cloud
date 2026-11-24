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
  Bot,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  AlertCircle,
  Check,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'
import { settingService } from '../../services/settingService'
import { showToast } from '../../hooks/useToast'

export function SettingsPage() {
  const { settings, isLoading, updateSchoolSettings, refreshSettings } = useSchoolSettings()

  // School Information States
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [bkPhone, setBkPhone] = useState('')
  const [bkEmail, setBkEmail] = useState('')
  const [cutoffTime, setCutoffTime] = useState('')
  const [activeAcademicYear, setActiveAcademicYear] = useState('')

  // Telegram Bot States
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramBotUsername, setTelegramBotUsername] = useState('')
  const [telegramBotServiceToken, setTelegramBotServiceToken] = useState('')
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(true)

  // UI Helper States
  const [showToken, setShowToken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingBot, setIsTestingBot] = useState(false)
  const [botTestResult, setBotTestResult] = useState<{
    success: boolean
    message: string
    botName?: string
    botUsername?: string
  } | null>(null)

  // Test Message State
  const [testChatId, setTestChatId] = useState('')
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (settings) {
      setSchoolName(settings.school_name || 'SMK IPTEK SANGGABUANA')
      setSchoolAddress(settings.school_address || '')
      setBkPhone(settings.school_phone || '')
      setBkEmail(settings.school_email || '')
      setCutoffTime(settings.cutoff_time || '08:00')
      setActiveAcademicYear(settings.active_academic_year || '2026/2027')

      setTelegramBotToken(settings.telegram_bot_token || '')
      setTelegramBotUsername(settings.telegram_bot_username || '')
      setTelegramBotServiceToken(settings.telegram_bot_service_token || 'secret_bot_service_token_smk_iptek_2026')
      setTelegramNotificationsEnabled(settings.telegram_notifications_enabled !== '0')
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
      telegram_bot_token: telegramBotToken.trim(),
      telegram_bot_username: telegramBotUsername.trim(),
      telegram_bot_service_token: telegramBotServiceToken.trim(),
      telegram_notifications_enabled: telegramNotificationsEnabled ? '1' : '0',
    })

    setIsSaving(false)
  }

  const handleTestBotConnection = async () => {
    if (!telegramBotToken.trim()) {
      showToast('Masukkan Token Bot Telegram terlebih dahulu.', 'warning')
      return
    }

    setIsTestingBot(true)
    setBotTestResult(null)

    try {
      const res = await settingService.testTelegram(telegramBotToken.trim())
      if (res.success && res.data) {
        setBotTestResult({
          success: true,
          message: res.message || 'Koneksi ke Bot Telegram BERHASIL!',
          botName: res.data.first_name,
          botUsername: res.data.username,
        })
        if (res.data.username && !telegramBotUsername) {
          setTelegramBotUsername(res.data.username)
        }
        showToast('Koneksi Bot Telegram BERHASIL terhubung!', 'success')
      } else {
        setBotTestResult({
          success: false,
          message: res.message || 'Gagal terhubung ke Bot Telegram.',
        })
        showToast(res.message || 'Gagal terhubung ke Telegram.', 'error')
      }
    } catch (err: any) {
      setBotTestResult({
        success: false,
        message: err.message || 'Koneksi ke Telegram gagal.',
      })
      showToast(err.message || 'Koneksi error.', 'error')
    } finally {
      setIsTestingBot(false)
    }
  }

  const handleSendTestMessage = async () => {
    const rawInput = testChatId.trim()
    if (!rawInput) {
      showToast('Masukkan Telegram Chat ID Anda.', 'warning')
      return
    }

    if (rawInput.startsWith('@')) {
      showToast(
        'Format belum sesuai. Telegram Bot mewajibkan Chat ID berupa deretan angka (contoh: 123456789), bukan username dengan @. Silakan ketik /id atau /start di bot untuk melihat Chat ID Anda.',
        'warning'
      )
      return
    }

    setIsSendingTestMessage(true)
    try {
      const res = await settingService.testSendMessage({
        chat_id: rawInput,
      })
      if (res.success) {
        showToast('Pesan notifikasi uji coba berhasil terkirim ke Telegram Anda!', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim pesan ke Telegram.', 'error', err.request_id)
    } finally {
      setIsSendingTestMessage(false)
    }
  }

  const cleanUsername = telegramBotUsername.replace('@', '').trim()

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Pengaturan Sistem & Bot Telegram"
        description={`Konfigurasi institusi sekolah, integrasi Bot Telegram, dan parameter administrasi BK ${schoolName || 'Sekolah'}`}
      />

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. TELEGRAM BOT SETTINGS CARD */}
        <div className="bg-white p-6 rounded-2xl border border-sky-200 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-2xl -z-10 pointer-events-none" />

          {/* Card Header with Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-sky-500 text-white rounded-xl shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  Integrasi Bot Telegram
                  {telegramBotToken ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Terkonfigurasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      Belum Dikonfigurasi
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Bot Telegram digunakan untuk mengirimkan notifikasi presensi otomatis dan surat panggilan BK ke orang tua murid.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cleanUsername && (
                <a
                  href={`https://t.me/${cleanUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Buka Bot @{cleanUsername}
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showGuide ? 'Tutup Panduan' : 'Panduan Setup'}</span>
              </button>
            </div>
          </div>

          {/* Step-by-step Setup Guide (Collapsible) */}
          {showGuide && (
            <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-xl space-y-2 text-xs text-slate-700">
              <h4 className="font-bold text-sky-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Langkah Membuat Bot Telegram di @BotFather:
              </h4>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Buka aplikasi Telegram, cari kontak resmi <strong>@BotFather</strong> (terdapat centang biru).</li>
                <li>Kirim perintah <code className="bg-white px-1.5 py-0.5 rounded text-sky-800 font-mono">/newbot</code> lalu ikuti instruksi nama bot.</li>
                <li>Tentukan username bot yang berakhiran <em>_bot</em> (contoh: <code className="bg-white px-1.5 py-0.5 rounded text-sky-800 font-mono">smkiptek_bk_bot</code>).</li>
                <li>BotFather akan memberikan <strong>HTTP API Token</strong> (contoh: <code className="bg-white px-1.5 py-0.5 rounded text-sky-800 font-mono">7123456789:AAH...</code>).</li>
                <li>Salin token tersebut dan tempel ke kolom <strong>Token Bot Telegram</strong> di bawah ini, lalu klik <strong>Uji Koneksi Bot</strong>.</li>
              </ol>
            </div>
          )}

          {/* Form Fields: Token & Username */}
          <div className="space-y-4">
            <FormField
              label="Token API Bot Telegram (HTTP API Token)"
              required
              hint="Dapatkan token resmi dari @BotFather di aplikasi Telegram."
            >
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="Contoh: 7123456789:AAHz_ABC123xyz-sampleToken"
                  className="w-full pl-3 pr-24 py-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                    title={showToken ? 'Sembunyikan Token' : 'Lihat Token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestBotConnection}
                    disabled={isTestingBot || !telegramBotToken.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-md shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingBot ? 'animate-spin' : ''}`} />
                    {isTestingBot ? 'Menguji...' : 'Uji Koneksi'}
                  </button>
                </div>
              </div>
            </FormField>

            {/* Test Result Alert */}
            {botTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                  botTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {botTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold">{botTestResult.message}</p>
                  {botTestResult.botName && (
                    <p className="text-[11px] mt-0.5 opacity-90">
                      Nama Bot: <strong>{botTestResult.botName}</strong> ({botTestResult.botUsername})
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Username Bot Telegram"
                hint="Gunakan awalan @ (contoh: @smkiptek_bk_bot)"
              >
                <input
                  type="text"
                  value={telegramBotUsername}
                  onChange={(e) => setTelegramBotUsername(e.target.value)}
                  placeholder="@smkiptek_bk_bot"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </FormField>

              <FormField
                label="Internal Service Secret Token"
                hint="Token rahasia komunikasi internal backend (default aman)"
              >
                <input
                  type="text"
                  value={telegramBotServiceToken}
                  onChange={(e) => setTelegramBotServiceToken(e.target.value)}
                  placeholder="secret_bot_service_token_smk_iptek_2026"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </FormField>
            </div>

            {/* Notification Master Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Aktifkan Notifikasi Otomatis Bot
                </label>
                <p className="text-[11px] text-slate-500">
                  Kirim notifikasi otomatis ke Telegram orang tua saat ada presensi Alpa/Sakit/Izin atau Kasus BK baru.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramNotificationsEnabled}
                  onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {/* Send Test Notification to User */}
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Uji Coba Kirim Notifikasi ke Akun Telegram (Chat ID)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Masukkan <strong className="text-slate-700">Chat ID Telegram Anda (berupa angka)</strong> untuk memastikan pesan bot dapat diterima secara langsung.
                  Telegram <em>tidak mendukung</em> pengiriman pesan pribadi bot langsung ke username (<code className="text-rose-600">@username</code>).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="Contoh: 123456789 (bukan @username)"
                  className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 font-mono ${
                    testChatId.trim().startsWith('@')
                      ? 'border-rose-300 bg-rose-50/50 text-rose-800 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-sky-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={isSendingTestMessage || !testChatId.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTestMessage ? 'animate-bounce' : ''}`} />
                  {isSendingTestMessage ? 'Mengirim...' : 'Kirim Notifikasi Tes'}
                </button>
              </div>

              {/* Dynamic warning if user types @username */}
              {testChatId.trim().startsWith('@') && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-[11px] text-amber-800 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Format belum sesuai:</span> Telegram Bot tidak dapat mengirim pesan langsung ke username (<code className="font-mono bg-amber-100 px-1 rounded">{testChatId.trim()}</code>). Gunakan deretan angka <strong>Chat ID</strong> unik akun Anda.
                  </div>
                </div>
              )}

              {/* Helper box: How to get Chat ID */}
              <div className="p-2.5 bg-sky-50/80 border border-sky-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-sky-900">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Cara mendapatkan Chat ID: Buka bot <strong>{telegramBotUsername || '@KedisiplinanSiswa_bot'}</strong> lalu kirim perintah <code className="bg-sky-100 px-1 rounded font-mono font-semibold">/id</code> atau <code className="bg-sky-100 px-1 rounded font-mono font-semibold">/start</code>.
                  </span>
                </div>
                {telegramBotUsername && (
                  <a
                    href={`https://t.me/${telegramBotUsername.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 hover:underline shrink-0 text-xs"
                  >
                    Buka Bot di Telegram &rarr;
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 2. SCHOOL & INSTITUTION INFORMATION */}
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
              hint="Nama sekolah akan otomatis tampil di Navbar, Sidebar, Formulir Barcode, dan Surat Resmi."
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

        {/* 3. COUNSELING & BOT TELEGRAM CONTACTS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <Phone className="w-4 h-4 text-navy-700" />
            Kontak Resmi Bimbingan Konseling (Ditampilkan di Bot Telegram)
          </div>
          <p className="text-xs text-slate-500">
            Kontak ini dikirimkan otomatis kepada orang tua murid saat menjalankan perintah /bantuan atau tombol Hubungi Guru BK.
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
                placeholder="bk@smkiptek.sch.id"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </FormField>
          </div>
        </div>

        {/* 4. ATTENDANCE CUTOFF RULES */}
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

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 active:bg-navy-950 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>

      </form>
    </div>
  )
}
