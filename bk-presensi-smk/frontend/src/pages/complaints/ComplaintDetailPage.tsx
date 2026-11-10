import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Paperclip,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
  Send,
  Trash2,
  Lock,
  Printer,
} from 'lucide-react'
import { complaintService, AddFollowupPayload } from '../../services/complaintService'
import { Complaint, ComplaintStatus, CaseFollowup, ComplaintStatusHistory } from '../../types'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton'
import { ErrorState } from '../../components/common/ErrorState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { OfficialLetterModal } from '../../components/common/OfficialLetterModal'
import { FormField } from '../../components/forms/FormField'
import { useAuth } from '../../hooks/useAuth'
import { showToast } from '../../hooks/useToast'

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canManageCase = hasRole(['admin', 'guru_bk'])

  const [complaint, setComplaint] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null)
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false)

  // Followup form
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupType, setFollowupType] = useState('Panggilan Bimbingan')
  const [followupParentVisible, setFollowupParentVisible] = useState(false)
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false)

  // Status update
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Diproses')
  const [statusNote, setStatusNote] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const resp = await complaintService.getComplaint(id)
      if (resp.success && resp.data) {
        setComplaint(resp.data)
        setNewStatus(resp.data.status)
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Gagal memuat detail pengaduan.',
        requestId: err.request_id,
      })
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Handle Update Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setIsUpdatingStatus(true)
    try {
      await complaintService.updateStatus(id, {
        status: newStatus,
        note: statusNote || undefined,
      })
      showToast(`Status pengaduan berhasil diubah menjadi ${newStatus}.`, 'success')
      setStatusNote('')
      fetchDetail()
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui status pengaduan.', 'error', err.request_id)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle Add Followup
  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !followupNotes.trim()) {
      showToast('Catatan tindak lanjut tidak boleh kosong.', 'warning')
      return
    }

    setIsSubmittingFollowup(true)
    try {
      const payload: AddFollowupPayload = {
        followup_type: followupType,
        notes: followupNotes,
        parent_visible: followupParentVisible,
      }
      await complaintService.addFollowup(id, payload)
      showToast('Catatan tindak lanjut berhasil disimpan.', 'success')
      setFollowupNotes('')
      fetchDetail()
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan tindak lanjut.', 'error', err.request_id)
    } finally {
      setIsSubmittingFollowup(false)
    }
  }

  // Handle Delete
  const handleDeleteComplaint = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await complaintService.deleteComplaint(id)
      showToast('Laporan pengaduan berhasil dihapus/diarsipkan.', 'success')
      navigate('/complaints')
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengaduan.', 'error', err.request_id)
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Detail Pengaduan" description="Memuat berkas kasus..." />
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <LoadingSkeleton rows={5} />
        </div>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <PageHeader title="Detail Pengaduan" />
        <ErrorState
          title="Pengaduan Tidak Ditemukan"
          message={error?.message || 'Data pengaduan tidak ditemukan di sistem.'}
          requestId={error?.requestId}
        />
        <Link
          to="/complaints"
          className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pengaduan
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Link>
      </div>

      <PageHeader
        title={`Kasus #${complaint.complaint_code}`}
        description={`Laporan Kasus Siswa: ${complaint.student?.name || complaint.student_name}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLetterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Surat Resmi (Panggilan / SP)
            </button>
            <StatusBadge status={complaint.status} size="md" />
            {canManageCase && (
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Hapus / Arsipkan Laporan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Details & Attachments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chronology Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-navy-700" />
                Kronologi Kejadian
              </h3>
              <span className="text-xs text-slate-400">
                Waktu Insiden: {new Date(complaint.incident_at).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {complaint.chronology}
            </div>

            {/* Violations associated */}
            {complaint.violations && complaint.violations.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Daftar Pelanggaran Terkait:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {complaint.violations.map((v: any) => (
                    <span
                      key={v.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      {v.name} (+{v.points || v.pivot?.points_snapshot || 0} Poin)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-navy-700" />
              Lampiran Bukti ({complaint.attachments?.length || 0})
            </h3>
            {complaint.attachments && complaint.attachments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {complaint.attachments.map((att: any) => (
                  <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-800">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{att.original_name}</span>
                      <span className="text-slate-400">
                        ({Math.round((att.file_size || 0) / 1024)} KB)
                      </span>
                    </div>
                    <a
                      href={complaintService.getAttachmentUrl(complaint.id, att.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold text-navy-700 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Buka File
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Tidak ada lampiran berkas pada laporan ini.</p>
            )}
          </div>

          {/* Followup Counseling Feed & Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-navy-700" />
              Riwayat Tindak Lanjut Konseling ({complaint.followups?.length || 0})
            </h3>

            {complaint.followups && complaint.followups.length > 0 ? (
              <div className="space-y-3">
                {complaint.followups.map((fp: CaseFollowup) => (
                  <div
                    key={fp.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900">{fp.followup_type}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(fp.followed_up_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-normal">{fp.notes}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-200/50">
                      <span>Petugas: {fp.user?.name || 'Guru BK'}</span>
                      <span>{fp.parent_visible ? '🟢 Dibagikan ke Wali' : '🔒 Khusus Internal'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">
                Belum ada catatan tindak lanjut untuk kasus ini.
              </p>
            )}

            {/* Add Followup Form */}
            {canManageCase && (
              <form onSubmit={handleAddFollowup} className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tambah Tindak Lanjut:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Jenis Tindakan">
                    <select
                      value={followupType}
                      onChange={(e) => setFollowupType(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                    >
                      <option value="Panggilan Bimbingan">Panggilan Bimbingan</option>
                      <option value="Konseling Individual">Konseling Individual</option>
                      <option value="Pemanggilan Orang Tua">Pemanggilan Orang Tua</option>
                      <option value="Pemberian Surat Peringatan">Pemberian Surat Peringatan</option>
                      <option value="Home Visit">Home Visit / Kunjungan Rumah</option>
                      <option value="Penyelesaian Kasus">Penyelesaian Kasus</option>
                    </select>
                  </FormField>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followupParentVisible}
                        onChange={(e) => setFollowupParentVisible(e.target.checked)}
                        className="rounded text-navy-600"
                      />
                      <span>Tampilkan catatan ke wali di Bot Telegram</span>
                    </label>
                  </div>
                </div>

                <FormField label="Catatan Penanganan & Tindakan" required>
                  <textarea
                    rows={3}
                    required
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    placeholder="Hasil pertemuan, komitmen siswa, atau kesepakatan..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  />
                </FormField>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingFollowup}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingFollowup ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Case Info, Status Update, & Audit Status Timeline */}
        <div className="space-y-6">
          {/* Case Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Informasi Terkait</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Kode Laporan</span>
                <span className="font-mono font-semibold text-slate-800">
                  {complaint.complaint_code}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Nama Siswa</span>
                <span className="font-semibold text-slate-800">
                  {complaint.student?.name || complaint.student_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Kelas</span>
                <span>{complaint.class?.name || complaint.class_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Pelapor</span>
                <span>{complaint.reported_by_user?.name || 'Siswa Mandiri'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Akses Orang Tua</span>
                <span className="font-semibold">
                  {complaint.parent_visible ? '🟢 Terbuka' : '🔒 Tertutup'}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status Card */}
          {canManageCase && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Perbarui Status Kasus</h3>
              <form onSubmit={handleUpdateStatus} className="space-y-3">
                <FormField label="Status Penanganan" required>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  >
                    <option value="Pending">Pending (Menunggu)</option>
                    <option value="Diproses">Diproses (Sedang Ditangani)</option>
                    <option value="Selesai">Selesai (Kasus Tuntas)</option>
                  </select>
                </FormField>

                <FormField label="Catatan Perubahan Status (Opsional)">
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Alasan perubahan status..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-600"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isUpdatingStatus || newStatus === complaint.status}
                  className="w-full py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isUpdatingStatus ? 'Memperbarui...' : 'Simpan Status'}
                </button>
              </form>
            </div>
          )}

          {/* Status Change Histories Audit Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-navy-700" />
              Histori Perubahan Status
            </h3>
            {complaint.status_histories && complaint.status_histories.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {complaint.status_histories.map((hist: ComplaintStatusHistory) => (
                  <div key={hist.id} className="relative pl-6 text-xs space-y-0.5">
                    <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-navy-600 ring-4 ring-white"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">
                        {hist.old_status ? `${hist.old_status} ➔ ` : ''}{hist.new_status}
                      </span>
                    </div>
                    {hist.note && <p className="text-slate-500 italic">"{hist.note}"</p>}
                    <p className="text-[10px] text-slate-400">
                      {new Date(hist.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada riwayat perubahan status.</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Arsipkan Pengaduan BK"
        message={`Apakah Anda yakin ingin menghapus atau mengarsipkan laporan #${complaint.complaint_code}? Seluruh riwayat akan tetap tercatat di audit log.`}
        confirmLabel="Hapus / Arsipkan"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteComplaint}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {/* Official Letter Modal */}
      {complaint && (
        <OfficialLetterModal
          isOpen={isLetterModalOpen}
          onClose={() => setIsLetterModalOpen(false)}
          complaintId={complaint.id}
        />
      )}
    </div>
  )
}
