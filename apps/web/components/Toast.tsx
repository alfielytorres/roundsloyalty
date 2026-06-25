'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastKind = 'success' | 'error'
interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastCtx { show: (kind: ToastKind, message: string) => void }
const Ctx = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast must be used within ToastProvider')
  return c
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, kind, message }])
    setTimeout(() => remove(id), 4200)
  }, [remove])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pointer-events-none">
        {toasts.map(t => (
          <button
            key={t.id}
            onClick={() => remove(t.id)}
            className="toast-in pointer-events-auto w-full max-w-sm flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.16)] bg-white/95 backdrop-blur-xl border border-black/5 text-left"
          >
            {t.kind === 'success'
              ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              : <AlertCircle size={18} className="text-red-500 shrink-0" />}
            <span className="flex-1 text-sm font-medium text-[#1D1D1F] leading-snug">{t.message}</span>
            <X size={14} className="text-black/25 shrink-0" />
          </button>
        ))}
      </div>
    </Ctx.Provider>
  )
}
