import React, { useState, useEffect, useCallback } from 'react'
import { Plus, UserCog, Edit2, ShieldAlert, X, Lock, Mail, User as UserIcon } from 'lucide-react'
import { userService, CreateUserPayload } from '../../services/userService'
import { User } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { FilterSelect } from '../../components/tables/FilterSelect'
import { StatusBadge } from '../../components/common/StatusBadge'
import { FormField } from '../../components/forms/FormField'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { showToast } from '../../hooks/useToast'

export function UserListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'guru_bk' | 'wali_kelas' | 'siswa'>('guru_bk')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Deactivate modal
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await userService.getUsers({ role: roleFilter || undefined })
      if (resp.success && resp.data) {
        setUsers(resp.data)
      }
    } catch (err: any) {
      setError({ message: err.message, requestId: err.request_id })
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleOpenModal = (u?: User) => {
    if (u) {
      setEditingUser(u)
      setName(u.name)
      setEmail(u.email)
      setPassword('')
      setRole(u.role)
      setIsActive(u.is_active)
    } else {
      setEditingUser(null)
      setName('')
      setEmail('')
      setPassword('')
      setRole('guru_bk')
      setIsActive(true)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      showToast('Nama dan email wajib diisi.', 'warning')
      return
    }
    if (!editingUser && !password) {
      showToast('Password wajib diisi untuk pengguna baru.', 'warning')
      return
    }

    const payload: Partial<CreateUserPayload> = {
      name,
      email,
      role,
      is_active: isActive,
    }
    if (password) {
      payload.password = password
    }

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, payload)
        showToast('Data pengguna berhasil diperbarui.', 'success')
      } else {
        await userService.createUser(payload as CreateUserPayload)
        showToast('Pengguna baru berhasil ditambahkan.', 'success')
      }
      setIsModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengguna.', 'error', err.request_id)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivatingUser) return
    setIsDeactivating(true)
    try {
      await userService.deactivateUser(deactivatingUser.id)
      showToast(`Akun ${deactivatingUser.name} berhasil dinonaktifkan.`, 'success')
      setDeactivatingUser(null)
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Gagal menonaktifkan akun.', 'error', err.request_id)
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Nama Pengguna',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-800">{row.name}</span>
            <span className="block text-xs text-slate-400">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Peran / Role',
      render: (row) => <StatusBadge status={row.role} />,
    },
    {
      key: 'is_active',
      header: 'Status Akun',
      render: (row) => <StatusBadge status={row.is_active ? 'aktif' : 'nonaktif'} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenModal(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Edit Akun"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeactivatingUser(row)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Nonaktifkan Akun"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna Sistem"
        description="Manajemen akun admin, guru bimbingan konseling, wali kelas, dan siswa SMK IPTEK SANGGABUANA"
        action={
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        }
      />

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="w-48">
          <FilterSelect
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            options={[
              { label: 'Admin', value: 'admin' },
              { label: 'Guru BK', value: 'guru_bk' },
              { label: 'Wali Kelas', value: 'wali_kelas' },
              { label: 'Siswa', value: 'siswa' },
            ]}
            placeholder="Semua Role"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        error={error}
        onRetry={fetchUsers}
        emptyMessage="Tidak ada pengguna yang terdaftar."
      />

      {/* Modal User Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nama Lengkap" required>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Drs. Ahmad Dahlan"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <FormField label="Alamat Email" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmad@smkiptek.sch.id"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <FormField
                label="Kata Sandi"
                required={!editingUser}
                hint={editingUser ? 'Kosongkan jika tidak ingin mengubah sandi.' : 'Minimal 8 karakter.'}
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Peran / Role" required>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="guru_bk">Guru BK</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="siswa">Siswa</option>
                  </select>
                </FormField>

                <FormField label="Status Akun">
                  <select
                    value={isActive ? '1' : '0'}
                    onChange={(e) => setIsActive(e.target.value === '1')}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </FormField>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      <ConfirmDialog
        isOpen={!!deactivatingUser}
        title="Nonaktifkan Akun Pengguna"
        message={`Apakah Anda yakin ingin menonaktifkan pengguna ${deactivatingUser?.name}? Pengguna ini tidak akan bisa login sampai diaktifkan kembali.`}
        confirmLabel="Nonaktifkan"
        isDestructive={true}
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivatingUser(null)}
      />
    </div>
  )
}
