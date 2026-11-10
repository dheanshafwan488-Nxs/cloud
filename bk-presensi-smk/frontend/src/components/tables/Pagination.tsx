import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PaginationMeta } from '../../types'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { current_page, last_page, total, per_page } = meta

  if (last_page <= 1) return null

  const startRecord = (current_page - 1) * per_page + 1
  const endRecord = Math.min(current_page * per_page, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-sm">
      <div className="text-slate-500 text-xs sm:text-sm">
        Menampilkan <span className="font-medium text-slate-700">{startRecord}</span> -{' '}
        <span className="font-medium text-slate-700">{endRecord}</span> dari{' '}
        <span className="font-medium text-slate-700">{total}</span> data
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 text-xs font-medium text-slate-700">
          Halaman {current_page} dari {last_page}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
