import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, School, AlertCircle, QrCode, ArrowRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'
import { CopyRequestId } from '../../components/common/CopyRequestId'
import { ToastContainer } from '../../components/feedback/ToastContainer'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const { settings } = useSchoolSettings()

  const [email, setEmail] = useState('gurubk@smkiptek.sch.id')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setErrorRequestId(null)

    if (!email || !password) {
      setErrorMessage('Harap isi email dan password dengan benar.')
      return
    }

    setIsLoading(true)
    try {
      const success = await login({ email, password })
      if (success) {
        navigate('/dashboard', { replace: true })
      } else {
        setErrorMessage('Login gagal. Periksa kembali email dan kata sandi Anda.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal. Silakan coba kembali.')
      if (err.request_id) {
        setErrorRequestId(err.request_id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Quick fill helper for Guru BK demo
  const handleQuickFillBk = () => {
    setEmail('gurubk@smkiptek.sch.id')
    setPassword('password')
    setErrorMessage(null)
    setErrorRequestId(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-navy-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo and Institution Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-800 text-navy-200 border border-navy-700 shadow-xl mb-4">
            <School className="w-8 h-8 text-blue-400" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/60 mb-2">
            Portal Khusus Guru BK
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {settings?.school_name || 'SMK IPTEK SANGGABUANA'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sistem Informasi Bimbingan Konseling & Layanan Pengaduan
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-6 bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{errorMessage}</p>
                  {errorRequestId && (
                    <div className="mt-1.5">
                      <CopyRequestId requestId={errorRequestId} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Alamat Email Guru BK
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gurubk@smkiptek.sch.id"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:bg-white transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                'Masuk Portal Guru BK'
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar for Guru BK */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              id="btn-demo-bk"
              type="button"
              onClick={handleQuickFillBk}
              className="w-full p-2.5 border border-blue-200 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              🤝 Klik Disini: Isi Akun Demo Guru BK
            </button>
          </div>
        </div>

        {/* Student Complaint Notice & Direct Link */}
        <div className="mt-5 bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 rounded-2xl p-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <QrCode className="w-4 h-4" />
            <span>Siswa Tidak Memiliki Akses Login</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Siswa cukup memindai <strong>QR Code / Barcode</strong> atau mengklik tautan di bawah untuk langsung mengisi formulir pengaduan secara mandiri & rahasia.
          </p>
          <Link
            to="/pengaduan-siswa"
            className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            <span>Buka Formulir Pengaduan Siswa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Akses login sistem dibatasi khusus untuk Guru BK SMK IPTEK SANGGABUANA.
        </p>
      </div>

      <ToastContainer />
    </div>
  )
}
