import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { aplicarData, destinosData, useColarData } from '../lib/colar'
import { fmtDate } from '../lib/dates'
import { janela } from '../lib/janela'
import { useCurrent } from '../store/notes'
import { AnexosDialog } from './Anexos'
import { RevisaoDialog } from './Revisao'
import { ModeloEditor } from './ModeloEditor'
import { ConfirmDialog } from './ConfirmDialog'
import { ReferenciaDialogs } from './Referencia'
import { Toaster } from './Shell'
import { Button } from './ui'

/** Pergunta em qual campo colocar uma data que foi colada. */
function ColarDataDialog() {
  const iso = useColarData((s) => s.iso)
  const n = useCurrent()
  const fechar = () => useColarData.setState({ iso: null })
  const destinos = n ? destinosData(n) : []

  useEffect(() => {
    if (!iso) return
    const w = janela()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
  }, [iso])

  return (
    <AnimatePresence>
      {iso && n && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fechar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-pop"
          >
            <div className="mb-3 flex items-center gap-3">
              <div>
                <h2 className="text-[15.5px] font-semibold">Onde colocar {fmtDate(iso)}?</h2>
                <p className="text-[12.5px] text-fg-3">Escolha o campo</p>
              </div>
            </div>
            <div className="grid max-h-[50vh] gap-1 overflow-y-auto">
              {destinos.map((d, i) => (
                <button
                  key={d.alvo}
                  type="button"
                  autoFocus={i === 0}
                  onClick={() => aplicarData(d, iso)}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-[13.5px] text-fg transition-colors hover:bg-surface-2 focus-visible:bg-primary-soft"
                >
                  {d.rotulo}
                  <ChevronRight className="size-4 text-fg-3" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={fechar}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Avisos e janelas de confirmação. Ficam na janela que está em uso (a aba ou a flutuante). */
export function Overlays() {
  return (
    <>
      <Toaster />
      <RevisaoDialog />
      <ReferenciaDialogs />
      <ConfirmDialog />
      <ModeloEditor />
      <AnexosDialog />
      <ColarDataDialog />
    </>
  )
}
