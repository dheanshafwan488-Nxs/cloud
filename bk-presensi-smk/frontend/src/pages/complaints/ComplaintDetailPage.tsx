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
  AlertTriangle,
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-navy-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Pengaduan
        </Link>
      </div>

      <PageHeader
        title={`Kasus #${complaint.complaint_code}`}
        description={`Laporan Kasus Siswa: ${complaint.student?.name || complaint.student_name}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLetterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-900 hover:bg-navy-950 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Surat Resmi (Panggilan / SP)
            </button>
            <StatusBadge status={complaint.status} size="md" />
            {canManageCase && (
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
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
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-navy-800" />
                Kronologi Kejadian
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                {new Date(complaint.incident_at).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-normal">
              {complaint.chronology}
            </div>

            {/* Manual Violation from student form */}
            {complaint.manual_violation && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pelanggaran yang Dilaporkan
                </h4>
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{complaint.manual_violation}</span>
                </div>
              </div>
            )}

            {/* Violations associated */}
            {complaint.violations && complaint.violations.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Pelanggaran Terkait
                </h4>
                <div className="flex flex-wrap gap-2">
                  {complaint.violations.map((v: any) => (
                    <span
                      key={v.id}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-900 border border-rose-300"
                    >
                      {v.name} (+{v.points || v.pivot?.points_snapshot || 0} Poin)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-200">
              <Paperclip className="w-4 h-4 text-navy-800" />
              Lampiran Bukti ({complaint.attachments?.length || 0})
            </h3>
            {complaint.attachments && complaint.attachments.length > 0 ? (
              <div className="space-y-2.5">
                {complaint.attachments.map((att: any) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 text-slate-900 min-w-0">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-navy-800 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{att.original_name}</p>
                        <p className="text-slate-600 font-medium">
                          {Math.round((att.file_size || 0) / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <a
                      href={complaintService.getAttachmentUrl(complaint.id, att.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs font-bold text-navy-900 hover:text-white bg-white hover:bg-navy-900 border border-slate-300 hover:border-navy-900 rounded-lg transition-colors shrink-0 shadow-2xs"
                    >
                      Buka Bukti
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-600">Tidak ada lampiran berkas pada laporan ini.</p>
            )}
          </div>

          {/* Followup Counseling Feed & Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-navy-800" />
              Riwayat Tindak Lanjut Konseling ({complaint.followups?.length || 0})
            </h3>

            {complaint.followups && complaint.followups.length > 0 ? (
              <div className="space-y-3">
                {complaint.followups.map((fp: CaseFollowup) => (
                  <div
                    key={fp.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-navy-950 text-sm">{fp.followup_type}</span>
                      <span className="text-xs font-medium text-slate-600">
                        {new Date(fp.followed_up_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-800 text-sm leading-relaxed">{fp.notes}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-semibold text-slate-600 border-t border-slate-200">
                      <span>Petugas: <strong className="text-slate-900">{fp.user?.name || 'Guru BK'}</strong></span>
                      <span className={fp.parent_visible ? 'text-emerald-800' : 'text-slate-700'}>
                        {fp.parent_visible ? '● Dibagikan ke Wali' : '● Khusus Internal BK'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-600 py-1">
                Belum ada catatan tindak lanjut untuk kasus ini.
              </p>
            )}

            {/* Add Followup Form */}
            {canManageCase && (
              <form onSubmit={handleAddFollowup} className="pt-4 border-t border-slate-200 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tambah Tindak Lanjut
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField label="Jenis Tindakan">
                    <select
                      value={followupType}
                      onChange={(e) => setFollowupType(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600"
                    >
                      <option value="Panggilan Bimbingan">Panggilan Bimbingan</option>
                      <option value="Konseling Individual">Konseling Individual</option>
                      <option value="Pemanggilan Orang Tua">Pemanggilan Orang Tua</option>
                      <option value="Pemberian Surat Peringatan">Pemberian Surat Peringatan</option>
                      <option value="Home Visit">Home Visit / Kunjungan Rumah</option>
                      <option value="Penyelesaian Kasus">Penyelesaian Kasus</option>
                    </select>
                  </FormField>

                  <div className="flex items-center sm:pt-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followupParentVisible}
                        onChange={(e) => setFollowupParentVisible(e.target.checked)}
                        className="rounded border-slate-400 text-navy-800 focus:ring-navy-600"
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
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder:text-slate-400"
                  />
                </FormField>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingFollowup}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
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
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="font-bold text-slate-900 text-sm pb-2.5 border-b border-slate-200">
              Informasi Kasus
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
                <span className="font-semibold text-slate-600">Kode Laporan</span>
                <span className="font-mono font-bold text-slate-900">
                  {complaint.complaint_code}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
                <span className="font-semibold text-slate-600">Siswa Terlapor</span>
                <span className="font-bold text-slate-900 text-right">
                  {complaint.student?.name || complaint.student_name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
                <span className="font-semibold text-slate-600">Kelas</span>
                <span className="font-bold text-slate-800">
                  {complaint.class?.name || complaint.class_name}
                </span>
              </div>

              {/* Confidential Reporter Box */}
              <div className="p-3 rounded-xl bg-navy-50/70 border border-navy-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-navy-700" />
                    Pelapor (Khusus Guru BK)
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-xs leading-snug">
                  {complaint.reporter_name || complaint.reported_by_user?.name || 'Siswa Terdaftar'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Identitas ini dirahasiakan & tidak tampil di surat resmi maupun Telegram wali.
                </p>
              </div>

              {complaint.manual_violation && (
                <div className="flex justify-between items-start py-1 border-b border-slate-100 gap-2">
                  <span className="font-semibold text-slate-600 shrink-0">Pelanggaran</span>
                  <span className="font-bold text-rose-900 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] text-right">
                    {complaint.manual_violation}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 gap-2">
                <span className="font-semibold text-slate-600">Akses Orang Tua</span>
                <span className={`font-bold ${complaint.parent_visible ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {complaint.parent_visible ? '● Terbuka' : '● Tertutup'}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status Card */}
          {canManageCase && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <h3 className="font-bold text-slate-900 text-sm pb-2.5 border-b border-slate-200">
                Perbarui Status Kasus
              </h3>
              <form onSubmit={handleUpdateStatus} className="space-y-3">
                <FormField label="Status Penanganan" required>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600"
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
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder:text-slate-400"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isUpdatingStatus || newStatus === complaint.status}
                  className="w-full py-2.5 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {isUpdatingStatus ? 'Memperbarui...' : 'Simpan Status'}
                </button>
              </form>
            </div>
          )}

          {/* Status Change Histories Audit Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2.5 border-b border-slate-200">
              <Clock className="w-4 h-4 text-navy-800" />
              Histori Perubahan Status
            </h3>
            {complaint.status_histories && complaint.status_histories.length > 0 ? (
              <div className="space-y-3.5 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {complaint.status_histories.map((hist: ComplaintStatusHistory) => (
                  <div key={hist.id} className="relative pl-6 text-xs space-y-0.5">
                    <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-navy-800 ring-4 ring-white"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">
                        {hist.old_status ? `${hist.old_status} → ` : ''}{hist.new_status}
                      </span>
                    </div>
                    {hist.note && <p className="text-slate-700 font-medium italic">"{hist.note}"</p>}
                    <p className="text-[11px] font-medium text-slate-500">
                      {new Date(hist.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-600">Belum ada riwayat perubahan status.</p>
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
