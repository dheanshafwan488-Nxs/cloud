import React from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  id?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  required,
  hint,
  id,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-800">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs font-medium text-slate-600">{hint}</p>}
      {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  )
}
