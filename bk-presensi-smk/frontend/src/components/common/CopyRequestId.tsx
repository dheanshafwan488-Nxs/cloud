import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyRequestIdProps {
  requestId: string
  className?: string
}

export function CopyRequestId({ requestId, className = '' }: CopyRequestIdProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(requestId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors ${className}`}>
      <span>ID: {requestId}</span>
      <button
        type="button"
        onClick={handleCopy}
        title="Salin Request ID untuk pelacakan log"
        className="text-slate-400 hover:text-slate-700 focus:outline-none"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
