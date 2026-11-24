import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, ShieldAlert, Edit2, Trash2, X, Archive, RotateCcw, Search } from 'lucide-react'
import { violationService, CreateViolationPayload } from '../../services/violationService'
import { Violation } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, Column } from '../../components/tables/DataTable'
import { FormField } from '../../components/forms/FormField'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { showToast } from '../../hooks/useToast'

export function ViolationListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'guru_bk'])

  const [violations, setViolations] = useState<Violation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState<number>(5)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Archive / Restore Dialog
  const [archivingViolation, setArchivingViolation] = useState<Violation | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  // Delete Dialog (Permanent)
  const [deletingViolation, setDeletingViolation] = useState<Violation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchViolations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const resp = await violationService.getViolations()
      if (resp.success && resp.data) {
        setViolations(resp.data)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat master pelanggaran.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchViolations()
  }, [fetchViolations])

  const handleOpenModal = (v?: Violation) => {
    if (v) {
      setEditingViolation(v)
      setName(v.name)
      setDescription(v.description || '')
      setPoints(v.points)
      setIsActive(v.is_active)
    } else {
      setEditingViolation(null)
      setName('')
      setDescription('')
      setPoints(5)
      setIsActive(true)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || points < 0) {
      showToast('Nama pelanggaran wajib diisi dan poin tidak boleh negatif.', 'warning')
      return
    }

    const payload: CreateViolationPayload = {
      name,
      description: description || undefined,
      points: Number(points),
      is_active: isActive,
    }

    setIsSubmitting(true)
    try {
      if (editingViolation) {
        await violationService.updateViolation(editingViolation.id, payload)
        showToast('Jenis pelanggaran berhasil diperbarui.', 'success')
      } else {
        await violationService.createViolation(payload)
        showToast('Jenis pelanggaran baru berhasil ditambahkan.', 'success')
      }
      setIsModalOpen(false)
      fetchViolations()
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pelanggaran.', 'error', err.request_id)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Archive / Restore
  const handleArchive = async () => {
    if (!archivingViolation) return
    setIsArchiving(true)
    const targetStatus = !archivingViolation.is_active
    try {
      await violationService.archiveViolation(archivingViolation.id, targetStatus)
      showToast(
        targetStatus
          ? `Pelanggaran "${archivingViolation.name}" berhasil diaktifkan kembali.`
          : `Pelanggaran "${archivingViolation.name}" berhasil diarsipkan.`,
        'success'
      )
      setArchivingViolation(null)
      fetchViolations()
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status pelanggaran.', 'error', err.request_id)
    } finally {
      setIsArchiving(false)
    }
  }

  // Handle Permanent Delete
  const handleDelete = async () => {
    if (!deletingViolation) return
    setIsDeleting(true)
    try {
      await violationService.deleteViolation(deletingViolation.id)
      showToast(`Pelanggaran "${deletingViolation.name}" berhasil dihapus secara permanen.`, 'success')
      setDeletingViolation(null)
      fetchViolations()
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pelanggaran secara permanen.', 'error', err.request_id)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered list
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (statusFilter === 'active' && !v.is_active) return false
      if (statusFilter === 'archived' && v.is_active) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = v.name.toLowerCase().includes(q)
        const matchDesc = v.description?.toLowerCase().includes(q)
        return matchName || matchDesc
      }
      return true
    })
  }, [violations, statusFilter, searchQuery])

  const totalCount = violations.length
  const activeCount = useMemo(() => violations.filter((v) => v.is_active).length, [violations])
  const archivedCount = useMemo(() => violations.filter((v) => !v.is_active).length, [violations])

  const columns: Column<Violation>[] = [
    {
      key: 'name',
      header: 'Nama Pelanggaran',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800">{row.name}</span>
          {row.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'points',
      header: 'Bobot Poin',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          +{row.points} Poin
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'aktif' : 'nonaktif'} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {canManage && (
            <>
              {/* Tombol Edit */}
              <button
                type="button"
                onClick={() => handleOpenModal(row)}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Edit Pelanggaran"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Tombol Arsip / Aktifkan Kembali */}
              {row.is_active ? (
                <button
                  type="button"
                  onClick={() => setArchivingViolation(row)}
                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Arsipkan (Nonaktifkan)"
                >
                  <Archive className="w-4 h-4 text-amber-600" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setArchivingViolation(row)}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Aktifkan Kembali"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                </button>
              )}

              {/* Tombol Hapus Permanen */}
              <button
                type="button"
                onClick={() => setDeletingViolation(row)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Hapus Pelanggaran (Permanen)"
              >
                <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Pelanggaran BK"
        description="Daftar referensi kode pelanggaran dan bobot poin kedisiplinan SMK IPTEK SANGGABUANA"
        action={
          canManage && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Pelanggaran
            </button>
          )
        }
      />

      {/* Snapshot notice alert */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Integritas Data:</span> Perubahan bobot poin tidak akan
          mengubah riwayat poin kasus lama yang telah tercatat (Point Snapshot). Anda dapat{' '}
          <span className="font-semibold text-amber-800">Mengarsipkan</span> pelanggaran agar tidak
          muncul pada form baru, atau <span className="font-semibold text-rose-800">Menghapus</span>{' '}
          pelanggaran secara permanen jika sudah tidak dibutuhkan.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau deskripsi..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-navy-800 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'archived'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Diarsipkan ({archivedCount})
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredViolations}
        isLoading={isLoading}
        error={error}
        onRetry={fetchViolations}
        emptyMessage={
          searchQuery
            ? 'Tidak ditemukan jenis pelanggaran yang sesuai kata kunci.'
            : statusFilter === 'archived'
            ? 'Belum ada jenis pelanggaran yang diarsipkan.'
            : 'Belum ada data master jenis pelanggaran.'
        }
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900">
                {editingViolation ? 'Edit Master Pelanggaran' : 'Tambah Jenis Pelanggaran'}
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
              <FormField label="Nama Pelanggaran" required hint="Contoh: Keterlambatan > 15 Menit">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama pelanggaran..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <FormField label="Deskripsi / Kriteria">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bobot Poin" required hint="Minimal 0">
                  <input
                    type="number"
                    min={0}
                    required
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                  />
                </FormField>

                <FormField label="Status Aktif">
                  <select
                    value={isActive ? '1' : '0'}
                    onChange={(e) => setIsActive(e.target.value === '1')}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif (Arsip)</option>
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

      {/* Archive / Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!archivingViolation}
        title={archivingViolation?.is_active ? 'Arsipkan Master Pelanggaran' : 'Aktifkan Kembali Pelanggaran'}
        message={
          archivingViolation?.is_active
            ? `Apakah Anda yakin ingin mengarsipkan jenis pelanggaran "${archivingViolation?.name}"? Pelanggaran ini tidak akan muncul pada pilihan pengaduan baru, namun riwayat kasus lama tetap aman tersimpan.`
            : `Aktifkan kembali jenis pelanggaran "${archivingViolation?.name}" agar dapat dipilih kembali dalam formulir pengaduan baru?`
        }
        confirmLabel={archivingViolation?.is_active ? 'Arsipkan' : 'Aktifkan Kembali'}
        isDestructive={archivingViolation?.is_active ? true : false}
        isLoading={isArchiving}
        onConfirm={handleArchive}
        onCancel={() => setArchivingViolation(null)}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingViolation}
        title="Hapus Pelanggaran Secara Permanen"
        message={`Apakah Anda yakin ingin menghapus permanen jenis pelanggaran "${deletingViolation?.name}" dari sistem? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Permanen"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingViolation(null)}
      />
    </div>
  )
}
