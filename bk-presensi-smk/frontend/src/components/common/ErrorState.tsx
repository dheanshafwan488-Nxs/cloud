import { AlertTriangle, RotateCcw } from 'lucide-react'
import { CopyRequestId } from './CopyRequestId'

interface ErrorStateProps {
  title?: string
  message?: string
  requestId?: string | null
  onRetry?: () => void
}

export function ErrorState({
  title = 'Gagal memuat data',
  message = 'Terjadi kendala saat menghubungi server.',
  requestId,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-600 max-w-md mb-3">{message}</p>

      {requestId && (
        <div className="mb-4">
          <CopyRequestId requestId={requestId} />
        </div>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-lg shadow-sm hover:bg-rose-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      )}
    </div>
  )
}
