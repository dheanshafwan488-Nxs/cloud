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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Institution Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-900 text-white border border-navy-800 shadow-sm mb-3.5">
            <School className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-navy-50 text-navy-900 border border-navy-200 mb-2">
              Portal Khusus Guru BK
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {settings?.school_name || 'SMK IPTEK SANGGABUANA'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Sistem Informasi Bimbingan Konseling & Layanan Pengaduan
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-6 bg-white py-7 px-6 sm:px-8 shadow-lg rounded-2xl border border-slate-200">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMessage}</p>
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
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Alamat Email Guru BK
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gurubk@smkiptek.sch.id"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold text-white bg-navy-900 hover:bg-navy-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50 transition-colors cursor-pointer"
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
          <div className="mt-5 pt-4 border-t border-slate-200">
            <button
              id="btn-demo-bk"
              type="button"
              onClick={handleQuickFillBk}
              className="w-full py-2.5 px-3 border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              Isi Otomatis Akun Demo Guru BK
            </button>
          </div>
        </div>

        {/* Student Complaint Notice & Direct Link */}
        <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
          <div className="inline-flex items-center justify-center gap-1.5 text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-700" />
            <span>Akses Pengaduan Siswa (Tanpa Login)</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Siswa cukup memindai <strong>QR Code</strong> atau membuka tautan di bawah untuk melapor. Identitas pelapor diverifikasi agar bebas fitnah dan <strong>hanya diketahui oleh Guru BK</strong>.
          </p>
          <Link
            to="/pengaduan-siswa"
            className="mt-3.5 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <span>Buka Formulir Pengaduan Siswa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-center text-xs font-medium text-slate-500">
          Akses login dibatasi khusus untuk Guru BK {settings?.school_name || 'SMK IPTEK SANGGABUANA'}.
        </p>
      </div>

      <ToastContainer />
    </div>
  )
}
