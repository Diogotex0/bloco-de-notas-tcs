import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, Lock } from 'lucide-react'
import { copiarAnotacao } from '../lib/actions'
import { Button, cx } from './ui'

/** Botão de copiar com 3 estados: normal, bloqueado (cadeado) e copiado (check). */
export function CopyButton({ bloqueado, label = 'Copiar texto', variant = 'primary', size = 'md' }: {
  bloqueado: boolean
  label?: string
  variant?: 'primary' | 'soft'
  size?: 'sm' | 'md'
}) {
  const [estado, setEstado] = useState<'idle' | 'ok'>('idle')
  const [tremer, setTremer] = useState(0)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Atalho Alt+C dispara este evento
  useEffect(() => {
    const on = (e: Event) => {
      const r = (e as CustomEvent).detail
      if (r === 'ok') {
        setEstado('ok')
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setEstado('idle'), 1600)
      } else if (r === 'bloqueado') setTremer((t) => t + 1)
    }
    window.addEventListener('copiar-resultado', on)
    return () => window.removeEventListener('copiar-resultado', on)
  }, [])

  const clicar = async () => {
    const r = await copiarAnotacao()
    window.dispatchEvent(new CustomEvent('copiar-resultado', { detail: r }))
  }

  const icone = estado === 'ok' ? <Check key="ok" /> : bloqueado ? <Lock key="lock" /> : <Copy key="copy" />
  return (
    <Button
      key={tremer}
      variant={estado === 'ok' ? 'primary' : bloqueado ? 'outline' : variant}
      size={size}
      onClick={clicar}
      title={bloqueado ? 'Bloqueado: confirme a validação da procuração particular' : 'Copiar texto (Alt + C)'}
      className={cx(
        tremer > 0 && 'shake',
        estado === 'ok' && '!bg-ok !text-surface',
        bloqueado && estado !== 'ok' && 'text-fg-3',
      )}
    >
      <span className="relative grid size-4 place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={icone.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="grid place-items-center"
          >
            {icone}
          </motion.span>
        </AnimatePresence>
      </span>
      {estado === 'ok' ? 'Copiado' : label}
    </Button>
  )
}
