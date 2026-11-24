import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Eye,
  Download,
  ExternalLink,
  X,
  Image as ImageIcon,
  Loader2,
  Edit3,
  Save,
} from 'lucide-react'
import { complaintService, AddFollowupPayload } from '../../services/complaintService'
import { violationService } from '../../services/violationService'
import { Complaint, ComplaintStatus, CaseFollowup, ComplaintStatusHistory, Violation } from '../../types'
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

  // Violations editor (Edit / Tambah Pelanggaran & Poin)
  const [masterViolations, setMasterViolations] = useState<Violation[]>([])
  const [isEditingViolations, setIsEditingViolations] = useState(false)
  const [editViolationIds, setEditViolationIds] = useState<number[]>([])
  const [editManualViolation, setEditManualViolation] = useState('')
  const [isSavingViolations, setIsSavingViolations] = useState(false)

  useEffect(() => {
    if (!canManageCase) return
    violationService
      .getViolations({ is_active: true })
      .then((res) => {
        if (res.success && res.data) {
          setMasterViolations(res.data)
        }
      })
      .catch(() => {})
  }, [canManageCase])

  const openViolationEditor = () => {
    if (!complaint) return
    const items: Array<{ id: number | null; name: string; points: number; is_manual?: boolean }> =
      complaint.violation_items || []
    const matchedIds = new Set<number>()
    const manualOnly: string[] = []

    if (items.length > 0) {
      items.forEach((it) => {
        if (it.id) {
          matchedIds.add(it.id)
        } else if (it.name) {
          manualOnly.push(it.name)
        }
      })
    } else if (complaint.violations?.length) {
      complaint.violations.forEach((v: any) => matchedIds.add(v.id))
      if (complaint.manual_violation) {
        manualOnly.push(complaint.manual_violation)
      }
    } else if (complaint.manual_violation) {
      manualOnly.push(complaint.manual_violation)
    }

    setEditViolationIds(Array.from(matchedIds))
    setEditManualViolation(manualOnly.join(', '))
    setIsEditingViolations(true)
  }

  const handleToggleEditViolation = (vid: number) => {
    setEditViolationIds((prev) =>
      prev.includes(vid) ? prev.filter((item) => item !== vid) : [...prev, vid]
    )
  }

  const liveEditedPoints = useMemo(() => {
    const selectedMaster = masterViolations.filter((v) => editViolationIds.includes(v.id))
    const selectedNamesLower = new Set(selectedMaster.map((v) => v.name.trim().toLowerCase()))
    const masterPts = selectedMaster.reduce((sum, v) => sum + Number(v.points || 0), 0)
    const manualItems = editManualViolation
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !selectedNamesLower.has(s.toLowerCase()))
    return masterPts + manualItems.length * 10
  }, [masterViolations, editViolationIds, editManualViolation])

  const handleSaveViolations = async () => {
    if (!complaint) return
    setIsSavingViolations(true)
    try {
      const resp = await complaintService.updateViolations(complaint.id, {
        violation_ids: editViolationIds,
        manual_violation: editManualViolation.trim() || undefined,
      })
      if (resp.success && resp.data) {
        setComplaint((prev: any) => ({
          ...prev,
          manual_violation: resp.data.manual_violation,
          violations: resp.data.violations,
          violation_items: resp.data.violation_items,
          total_points: resp.data.total_points,
          student_cumulative_points: resp.data.student_cumulative_points,
        }))
        setIsEditingViolations(false)
        showToast(
          `Pelanggaran berhasil diperbarui! Total poin kasus: +${resp.data.total_points} Poin.`,
          'success'
        )
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui pelanggaran kasus.', 'error', err?.request_id)
    } finally {
      setIsSavingViolations(false)
    }
  }

  // Attachment preview modal
  const [previewAttachment, setPreviewAttachment] = useState<{
    id: number
    original_name: string
    mime_type: string
    file_size?: number
    blobUrl: string | null
    isLoading: boolean
    error: string | null
  } | null>(null)
  const [downloadingAttId, setDownloadingAttId] = useState<number | null>(null)

  const closePreviewModal = useCallback(() => {
    setPreviewAttachment((prev) => {
      if (prev?.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl)
      }
      return null
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreviewModal()
      }
    }
    if (previewAttachment) {
      window.addEventListener('keydown', onKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [previewAttachment, closePreviewModal])

  useEffect(() => {
    return () => {
      if (previewAttachment?.blobUrl) {
        URL.revokeObjectURL(previewAttachment.blobUrl)
      }
    }
  }, [previewAttachment?.blobUrl])

  const isImageAttachment = (mimeType?: string, fileName?: string) => {
    if (mimeType?.startsWith('image/')) return true
    return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName || '')
  }

  const isPdfAttachment = (mimeType?: string, fileName?: string) => {
    if (mimeType === 'application/pdf') return true
    return /\.pdf$/i.test(fileName || '')
  }

  const handleOpenAttachment = async (att: { id: number; original_name: string; mime_type?: string; file_size?: number }) => {
    if (!complaint) return

    setPreviewAttachment((prev) => {
      if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl)
      return {
        id: att.id,
        original_name: att.original_name,
        mime_type: att.mime_type || '',
        file_size: att.file_size,
        blobUrl: null,
        isLoading: true,
        error: null,
      }
    })

    try {
      const { blob, contentType } = await complaintService.fetchAttachmentBlob(
        complaint.id,
        att.id,
        att.mime_type
      )
      const blobUrl = URL.createObjectURL(blob)
      setPreviewAttachment((prev) => {
        if (!prev || prev.id !== att.id) {
          URL.revokeObjectURL(blobUrl)
          return prev
        }
        return {
          ...prev,
          mime_type: prev.mime_type || contentType,
          blobUrl,
          isLoading: false,
          error: null,
        }
      })
    } catch (err: any) {
      const msg = err?.message || 'Gagal memuat bukti lampiran.'
      setPreviewAttachment((prev) =>
        prev && prev.id === att.id
          ? { ...prev, isLoading: false, error: msg }
          : prev
      )
      showToast(msg, 'error', err?.request_id)
    }
  }

  const handleDownloadAttachment = async (att: { id: number; original_name: string; mime_type?: string }) => {
    if (!complaint) return
    setDownloadingAttId(att.id)
    try {
      const { blob } = await complaintService.fetchAttachmentBlob(complaint.id, att.id, att.mime_type)
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = att.original_name || `bukti-${att.id}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengunduh bukti lampiran.', 'error', err?.request_id)
    } finally {
      setDownloadingAttId(null)
    }
  }

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
        description={`Laporan Kasus Siswa: ${complaint.student?.name || complaint.student_name}${complaint.student?.nis ? ` (NIS: ${complaint.student.nis})` : ''}`}
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

            {/* Violations & Points Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Daftar Pelanggaran & Bobot Poin
                  </h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white">
                    Total +{complaint.total_points ?? 0} Poin
                  </span>
                </div>

                {canManageCase && !isEditingViolations && (
                  <button
                    type="button"
                    onClick={openViolationEditor}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-navy-900 hover:text-white bg-navy-50 hover:bg-navy-900 border border-navy-200 hover:border-navy-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit / Tambah Pelanggaran
                  </button>
                )}
              </div>

              {!isEditingViolations ? (
                complaint.violation_items && complaint.violation_items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {complaint.violation_items.map((item: any, idx: number) => (
                      <span
                        key={`${item.id ?? 'manual'}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-900 border border-rose-300"
                      >
                        <span>{item.name}</span>
                        <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-700">
                          +{item.points} Poin
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada jenis pelanggaran yang dipilih untuk kasus ini.
                  </p>
                )
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-navy-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-navy-950">
                      Pilih Pelanggaran (Klik untuk memilih / klik lagi untuk batal):
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white">
                      Estimasi Total: +{liveEditedPoints} Poin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {masterViolations.map((v) => {
                      const isChecked = editViolationIds.includes(v.id)
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleToggleEditViolation(v.id)}
                          className={`text-left flex items-center justify-between gap-2 p-2.5 rounded-lg text-xs border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-navy-900 hover:bg-rose-700 text-white border-navy-900 hover:border-rose-700 font-bold'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-medium'
                          }`}
                        >
                          <span className="truncate">
                            {isChecked ? '✓ ' : '+ '}
                            {v.name}
                          </span>
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                              isChecked
                                ? 'bg-white/20 text-white'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            +{v.points}p
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pelanggaran Lainnya / Tambahan (Opsional, pisahkan koma • +10 Poin/item)
                    </label>
                    <input
                      type="text"
                      value={editManualViolation}
                      onChange={(e) => setEditManualViolation(e.target.value)}
                      placeholder="Contoh: Perundungan verbal, membawa barang terlarang..."
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingViolations(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveViolations}
                      disabled={isSavingViolations}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingViolations ? 'Menyimpan...' : 'Simpan Pelanggaran & Poin'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                        {isImageAttachment(att.mime_type, att.original_name) ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{att.original_name}</p>
                        <p className="text-slate-600 font-medium">
                          {Math.round((att.file_size || 0) / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAttachment(att)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-navy-900 hover:text-white bg-white hover:bg-navy-900 border border-slate-300 hover:border-navy-900 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Buka Bukti
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        disabled={downloadingAttId === att.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-navy-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Unduh file bukti"
                      >
                        {downloadingAttId === att.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
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
                <span className="font-semibold text-slate-600">NIS Siswa</span>
                <span className="font-mono font-bold text-navy-900 bg-navy-50 border border-navy-200 px-2 py-0.5 rounded">
                  {complaint.student?.nis || complaint.student_nis || '-'}
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

              <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
                <span className="font-semibold text-slate-600">Poin Kasus Ini</span>
                <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  +{complaint.total_points ?? 0} Poin
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 gap-2">
                <span className="font-semibold text-slate-600">Akumulasi Poin Siswa</span>
                <span className="font-mono font-bold text-white bg-rose-600 px-2 py-0.5 rounded">
                  {complaint.student_cumulative_points ?? complaint.total_points ?? 0} Poin
                </span>
              </div>
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
          onClick={closePreviewModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {previewAttachment.original_name}
                </h3>
                {previewAttachment.file_size ? (
                  <p className="text-xs text-slate-500">
                    {Math.round(previewAttachment.file_size / 1024)} KB
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewAttachment.blobUrl && (
                  <>
                    <a
                      href={previewAttachment.blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-navy-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Tab Baru
                    </a>
                    <a
                      href={previewAttachment.blobUrl}
                      download={previewAttachment.original_name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto bg-slate-900/5 p-4 flex items-center justify-center min-h-[300px]">
              {previewAttachment.isLoading ? (
                <div className="flex flex-col items-center gap-2.5 text-slate-600 py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-navy-800" />
                  <p className="text-xs font-semibold">Memuat bukti lampiran...</p>
                </div>
              ) : previewAttachment.error ? (
                <div className="flex flex-col items-center gap-2 text-rose-700 py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <p className="text-sm font-bold">Gagal membuka bukti lampiran</p>
                  <p className="text-xs text-slate-600">{previewAttachment.error}</p>
                </div>
              ) : previewAttachment.blobUrl ? (
                isImageAttachment(previewAttachment.mime_type, previewAttachment.original_name) ? (
                  <img
                    src={previewAttachment.blobUrl}
                    alt={previewAttachment.original_name}
                    className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-sm bg-white"
                  />
                ) : isPdfAttachment(previewAttachment.mime_type, previewAttachment.original_name) ? (
                  <iframe
                    src={previewAttachment.blobUrl}
                    title={previewAttachment.original_name}
                    className="w-full h-[72vh] rounded-lg border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-700 py-12 text-center">
                    <FileText className="w-10 h-10 text-navy-700" />
                    <p className="text-sm font-semibold">
                      Pratinjau tidak tersedia untuk format file ini.
                    </p>
                    <a
                      href={previewAttachment.blobUrl}
                      download={previewAttachment.original_name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-xl"
                    >
                      <Download className="w-4 h-4" />
                      Unduh File
                    </a>
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
