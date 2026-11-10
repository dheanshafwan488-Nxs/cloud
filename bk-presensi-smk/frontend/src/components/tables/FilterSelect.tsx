import React from 'react'

export interface Option {
  label: string
  value: string | number
}

interface FilterSelectProps {
  label?: string
  value: string | number
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Semua',
  className = '',
}: FilterSelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium text-slate-500">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent text-slate-800 transition-all cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
