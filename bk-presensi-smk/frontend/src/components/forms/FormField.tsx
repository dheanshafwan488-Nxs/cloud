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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}
