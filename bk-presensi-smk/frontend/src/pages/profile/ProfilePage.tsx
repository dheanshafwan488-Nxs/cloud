import React, { useState, useEffect } from 'react'
import {
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { FormField } from '../../components/forms/FormField'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { showToast } from '../../hooks/useToast'

export function ProfilePage() {
  const { user, updateProfile } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.')
      return
    }

    if (!email.trim()) {
      setErrorMsg('Email tidak boleh kosong.')
      return
    }

    if (password) {
      if (password.length < 8) {
        setErrorMsg('Kata sandi baru minimal 8 karakter.')
        return
      }
      if (password !== passwordConfirmation) {
        setErrorMsg('Konfirmasi kata sandi baru tidak cocok.')
        return
      }
      if (!currentPassword) {
        setErrorMsg('Masukkan kata sandi saat ini untuk mengubah kata sandi.')
        return
      }
    }

    setIsSubmitting(true)

    const payload = {
      name: name.trim(),
      email: email.trim(),
      ...(password
        ? {
            current_password: currentPassword,
            password,
            password_confirmation: passwordConfirmation,
          }
        : {}),
    }

    const success = await updateProfile(payload)
    setIsSubmitting(false)

    if (success) {
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
    }
  }

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator Sistem'
      case 'guru_bk':
        return 'Guru Bimbingan Konseling (BK)'
      case 'wali_kelas':
        return 'Wali Kelas'
      case 'siswa':
        return 'Siswa'
      default:
        return role || '-'
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Profil Pengguna"
        description="Kelola informasi identitas pribadi, kontak email, dan perbarui kata sandi akun Anda"
      />

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 p-6 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-inner">
          {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-10 h-10" />}
        </div>
        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <StatusBadge status={user?.role || 'siswa'} size="sm" />
          </div>
          <p className="text-sm text-navy-200">{user?.email}</p>
          <p className="text-xs text-navy-300 font-mono">
            Peran: <span className="font-semibold">{getRoleLabel(user?.role)}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <UserIcon className="w-4 h-4 text-navy-700" />
            Informasi Pribadi
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nama Lengkap" required>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  placeholder="Nama lengkap Anda"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </FormField>

            <FormField label="Alamat Email" required>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  placeholder="email@sekolah.sch.id"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hak Akses / Peran
              </label>
              <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 flex items-center justify-between">
                <span>{getRoleLabel(user?.role)}</span>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Peran hak akses hanya dapat diubah oleh Administrator sistem.
              </p>
            </div>
          </div>
        </div>

        {/* Password Security */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <KeyRound className="w-4 h-4 text-navy-700" />
            Keamanan & Ganti Kata Sandi
          </div>
          <p className="text-xs text-slate-500">
            Kosongkan kolom di bawah jika Anda tidak bermaksud mengubah kata sandi akun Anda.
          </p>

          <div className="space-y-4 max-w-lg">
            <FormField
              label="Kata Sandi Saat Ini"
              hint="Dibutuhkan jika ingin mengganti kata sandi baru"
            >
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  placeholder="Masukkan kata sandi saat ini"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Kata Sandi Baru" hint="Minimal 8 karakter">
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </FormField>

              <FormField label="Konfirmasi Kata Sandi Baru">
                <div className="relative">
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                    placeholder="Ulangi kata sandi baru"
                    autoComplete="new-password"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Perubahan profil akan langsung berlaku di seluruh sistem.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
          </button>
        </div>
      </form>
    </div>
  )
}
