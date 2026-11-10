import React from 'react'
import { LoadingSkeleton } from '../common/LoadingSkeleton'
import { EmptyState } from '../common/EmptyState'
import { ErrorState } from '../common/ErrorState'
import { Pagination } from './Pagination'
import { PaginationMeta } from '../../types'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  error?: { message: string; requestId?: string | null } | null
  onRetry?: () => void
  emptyMessage?: string
  emptyAction?: React.ReactNode
  paginationMeta?: PaginationMeta | null
  onPageChange?: (page: number) => void
  rowKey?: (row: T, index: number) => string | number
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'Belum ada data untuk ditampilkan.',
  emptyAction,
  paginationMeta,
  onPageChange,
  rowKey,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <LoadingSkeleton rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <ErrorState
          title="Gagal memuat tabel"
          message={error.message}
          requestId={error.requestId}
          onRetry={onRetry}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <EmptyState description={emptyMessage} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => {
              const key = rowKey ? rowKey(row, index) : row.id || index
              return (
                <tr key={key} className="hover:bg-slate-50/70 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 align-middle ${col.className || ''}`}>
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {paginationMeta && onPageChange && (
        <Pagination meta={paginationMeta} onPageChange={onPageChange} />
      )}
    </div>
  )
}
