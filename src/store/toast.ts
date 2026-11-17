import { create } from 'zustand'

export type ToastType = 'success' | 'info' | 'warn' | 'danger'
export interface Toast {
  id: number
  msg: string
  type: ToastType
  action?: { label: string; run: () => void }
  duration: number
}

let seq = 0

export const useToasts = create<{ list: Toast[]; dismiss: (id: number) => void }>((set) => ({
  list: [],
  dismiss: (id) => set((s) => ({ list: s.list.filter((t) => t.id !== id) })),
}))

export function toast(msg: string, opts: { type?: ToastType; action?: Toast['action']; duration?: number } = {}) {
  const t: Toast = { id: ++seq, msg, type: opts.type ?? 'info', action: opts.action, duration: opts.duration ?? 4200 }
  useToasts.setState((s) => ({ list: [...s.list.slice(-2), t] }))
  return t.id
}
