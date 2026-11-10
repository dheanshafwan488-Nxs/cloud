import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, School, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSchoolSettings } from '../../hooks/useSchoolSettings'
import { CopyRequestId } from '../../components/common/CopyRequestId'
import { ToastContainer } from '../../components/feedback/ToastContainer'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()
  const { settings } = useSchoolSettings()

  const [email, setEmail] = useState('admin@smkiptek.sch.id')
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

  // Quick fill helper for Sempro / KKP demo
  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
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
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {settings?.school_name || 'SMK IPTEK SANGGABUANA'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sistem Informasi Bimbingan Konseling & Presensi Siswa
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-8 bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
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
                Alamat Email
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
                  placeholder="admin@smkiptek.sch.id"
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
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar for Sempro / Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Pilihan Akun Uji Coba Demo:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                id="btn-demo-admin"
                type="button"
                onClick={() => handleQuickFill('admin@smkiptek.sch.id', 'password')}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-navy-50 hover:border-navy-300 text-slate-700 text-left font-medium transition-colors"
              >
                🛡️ Admin
              </button>
              <button
                id="btn-demo-bk"
                type="button"
                onClick={() => handleQuickFill('gurubk@smkiptek.sch.id', 'password')}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-navy-50 hover:border-navy-300 text-slate-700 text-left font-medium transition-colors"
              >
                🤝 Guru BK
              </button>
              <button
                id="btn-demo-wali"
                type="button"
                onClick={() => handleQuickFill('wali@smkiptek.sch.id', 'password')}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-navy-50 hover:border-navy-300 text-slate-700 text-left font-medium transition-colors"
              >
                📋 Wali Kelas
              </button>
              <button
                id="btn-demo-siswa"
                type="button"
                onClick={() => handleQuickFill('siswa@smkiptek.sch.id', 'password')}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-navy-50 hover:border-navy-300 text-slate-700 text-left font-medium transition-colors"
              >
                🎓 Siswa
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Akses terbatas. Dilindungi oleh enkripsi dan audit logging terpusat.
        </p>
      </div>

      <ToastContainer />
    </div>
  )
}
