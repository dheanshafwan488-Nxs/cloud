import React, { useState } from 'react'
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { studentService, ImportResult } from '../../services/studentService'
import { showToast } from '../../hooks/useToast'
import { CopyRequestId } from '../../components/common/CopyRequestId'

interface StudentImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function StudentImportModal({ isOpen, onClose, onSuccess }: StudentImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setErrorRequestId(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setErrorRequestId(null)
    try {
      const resp = await studentService.importStudents(file)
      if (resp.success && resp.data) {
        setResult(resp.data)
        showToast(
          `Impor selesai: ${resp.data.success_count} berhasil, ${resp.data.failed_count} gagal.`,
          resp.data.failed_count > 0 ? 'warning' : 'success'
        )
        onSuccess()
      }
    } catch (err: any) {
      setErrorRequestId(err.request_id)
      showToast(err.message || 'Gagal memproses file CSV.', 'error', err.request_id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,nis,nisn,name,gender,birth_date,class_name,enrollment_status\n' +
      '2026001,0012345678,Ahmad Siswa,L,2008-05-15,X RPL 1,aktif\n' +
      '2026002,0012345679,Siti Siswi,P,2008-08-20,X RPL 1,aktif\n'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'template_import_siswa.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-navy-600" />
            Impor Data Siswa CSV
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template download bar */}
        <div className="mb-5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-blue-900">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Gunakan format template resmi agar data valid.</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Template
          </button>
        </div>

        {/* File Drag / Select Box */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Pilih File CSV Siswa
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-navy-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csvFileInput"
            />
            <label htmlFor="csvFileInput" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-navy-700">
                {file ? file.name : 'Klik untuk memilih file CSV'}
              </span>
              <span className="text-xs text-slate-400 mt-1">Maksimal 5MB (.csv)</span>
            </label>
          </div>
        </div>

        {errorRequestId && (
          <div className="mb-4">
            <CopyRequestId requestId={errorRequestId} />
          </div>
        )}

        {/* Import Results Summary */}
        {result && (
          <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Hasil Pemrosesan:
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Total Baris</span>
                <span className="font-bold text-slate-800 text-sm">{result.total_processed}</span>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                <span className="block">Berhasil</span>
                <span className="font-bold text-sm">{result.success_count}</span>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-800">
                <span className="block">Gagal</span>
                <span className="font-bold text-sm">{result.failed_count}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-semibold text-rose-700 mb-1">Daftar Baris Error:</p>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-rose-100">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="text-rose-600 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Baris {err.row} {err.nis ? `(NIS: ${err.nis})` : ''}: {err.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Mengimpor...' : 'Mulai Impor Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
