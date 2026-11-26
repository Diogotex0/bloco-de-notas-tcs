import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useConfirm } from '../store/confirm'
import { janela } from '../lib/janela'
import { Button } from './ui'

export function ConfirmDialog() {
  const { pedido, responder } = useConfirm()
  const cancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pedido) return
    // Foco começa no "Cancelar": Enter por engano não apaga nada.
    const w = janela()
    w.setTimeout(() => cancelar.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') responder(false)
    }
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
  }, [pedido, responder])

  return (
    <AnimatePresence>
      {pedido && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => responder(false)}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-titulo"
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-pop"
          >
            <h2 id="confirm-titulo" className="text-[16px] font-semibold">
              {pedido.titulo}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">{pedido.texto}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button ref={cancelar} variant="outline" onClick={() => responder(false)}>
                Cancelar
              </Button>
              <Button variant="primary" className="!bg-bad !shadow-none hover:!brightness-110" onClick={() => responder(true)}>
                {pedido.botao}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
