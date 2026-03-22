import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const delta = 2
    const left = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    for (let i = left; i <= right; i++) pages.push(i)
    return pages
  }

  const btnBase =
    'inline-flex items-center justify-center w-7 h-7 rounded text-xs font-medium border transition-colors'
  const btnActive = 'bg-blue-600 text-white border-blue-600'
  const btnInactive =
    'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 hover:border-blue-300'
  const btnDisabled = 'bg-white dark:bg-gray-700 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-600 cursor-not-allowed'

  return (
    <div className="flex items-center gap-1">
      <button
        className={`${btnBase} ${page <= 1 ? btnDisabled : btnInactive}`}
        onClick={() => onPageChange(1)}
        disabled={page <= 1}
        title="Primeira página"
      >
        <ChevronsLeft className="w-3 h-3" />
      </button>
      <button
        className={`${btnBase} ${page <= 1 ? btnDisabled : btnInactive}`}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        title="Página anterior"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {getPageNumbers().map((p) => (
        <button
          key={p}
          className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      <button
        className={`${btnBase} ${page >= totalPages ? btnDisabled : btnInactive}`}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        title="Próxima página"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
      <button
        className={`${btnBase} ${page >= totalPages ? btnDisabled : btnInactive}`}
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages}
        title="Última página"
      >
        <ChevronsRight className="w-3 h-3" />
      </button>
    </div>
  )
}
