import { useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  requestId?: string | null
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = []
let toastsState: ToastMessage[] = []

function notifyListeners() {
  toastListeners.forEach((fn) => fn([...toastsState]))
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  requestId?: string | null
) {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast: ToastMessage = { id, type, message, requestId }
  toastsState = [...toastsState, newToast]
  notifyListeners()

  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id)
    notifyListeners()
  }, 5000)
}

export function useToast() {
  const [, setTrigger] = useState(0)

  const addListener = useCallback(() => {
    const listener = () => setTrigger((prev) => prev + 1)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  return {
    toasts: toastsState,
    subscribe: addListener,
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string, reqId?: string | null) => showToast(msg, 'error', reqId),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
    dismiss: (id: string) => {
      toastsState = toastsState.filter((t) => t.id !== id)
      notifyListeners()
    },
  }
}
