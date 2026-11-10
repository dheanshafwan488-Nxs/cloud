import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast, ToastMessage } from '../../hooks/useToast'
import { CopyRequestId } from '../common/CopyRequestId'

export function ToastContainer() {
  const { toasts, dismiss, subscribe } = useToast()
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>(toasts)

  useEffect(() => {
    return subscribe()
  }, [subscribe])

  useEffect(() => {
    setCurrentToasts(toasts)
  }, [toasts])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {currentToasts.map((toast) => {
        let bgStyle = 'bg-white border-slate-200 text-slate-800'
        let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />

        switch (toast.type) {
          case 'success':
            bgStyle = 'bg-white border-emerald-200 text-slate-800'
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            break
          case 'error':
            bgStyle = 'bg-white border-rose-200 text-slate-800'
            icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            break
          case 'warning':
            bgStyle = 'bg-white border-amber-200 text-slate-800'
            icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            break
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${bgStyle} transition-all animate-fadeIn`}
          >
            {icon}
            <div className="flex-1 text-sm">
              <p className="font-medium text-slate-800">{toast.message}</p>
              {toast.requestId && (
                <div className="mt-1.5">
                  <CopyRequestId requestId={toast.requestId} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none -mr-1 -mt-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
