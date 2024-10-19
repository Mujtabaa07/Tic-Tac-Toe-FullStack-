import { useState, useCallback } from 'react'

export interface ToastOptions {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([])

  const toast = useCallback((options: ToastOptions) => {
    setToasts((currentToasts) => [...currentToasts, options])
  }, [])

  const dismissToast = useCallback((index: number) => {
    setToasts((currentToasts) => currentToasts.filter((_, i) => i !== index))
  }, [])

  return { toast, toasts, dismissToast }
}