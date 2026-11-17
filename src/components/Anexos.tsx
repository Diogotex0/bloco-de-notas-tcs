import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Paperclip } from 'lucide-react'
import { anexosNecessarios, anexosPendentes } from '../lib/anexos'
import { copiarFinal } from '../lib/actions'
import { janela } from '../lib/janela'
import { useCurrent, useNotes } from '../store/notes'
import { toast } from '../store/toast'
import { pedirConferencia, useAnexos, type AcaoAnexos } from '../store/anexos'
import { Button, Checkbox, cx } from './ui'


const BOTAO: Record<AcaoAnexos, string> = {
  copiar: 'Copiar texto',
  finalizar: 'Finalizar anotação',
  confirmar: 'Confirmar',
}

/** Conferência rápida: só copia/finaliza depois de confirmar cada anexo. */
export function AnexosDialog() {
  const acao = useAnexos((s) => s.acao)
  const n = useCurrent()
  const lista = n ? anexosNecessarios(n) : []
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!acao || !n) return
    setMarcados(new Set(n.anexosOk))
    const w = janela()
    const t = w.setTimeout(() => caixa.current?.querySelector<HTMLInputElement>('input[type=checkbox]:not(:checked)')?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    w.addEventListener('keydown', onKey)
    return () => {
      w.clearTimeout(t)
      w.removeEventListener('keydown', onKey)
    }
  }, [acao, n?.id])

  const fechar = () => useAnexos.setState({ acao: null })
  const tudo = lista.length > 0 && lista.every((a) => marcados.has(a.chave))

  const confirmar = async () => {
    if (!tudo || !acao) return
    const chaves = lista.map((a) => a.chave)
    useNotes.getState().editar((d) => void (d.anexosOk = [...new Set([...d.anexosOk, ...chaves])]))
    fechar()
    if (acao === 'copiar') {
      const r = await copiarFinal()
      window.dispatchEvent(new CustomEvent('copiar-resultado', { detail: r }))
    }
    else if (acao === 'finalizar') {
      useNotes.getState().editar((d) => void (d.situacao = 'finalizada'))
      toast('Anotação finalizada. Ela fica na aba “Finalizadas”.', { type: 'success' })
    } else toast('Anexos confirmados', { type: 'success' })
  }

  return (
    <AnimatePresence>
      {acao && n && lista.length > 0 && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fechar}
        >
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-labelledby="anexos-titulo"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tudo) {
                e.preventDefault()
                void confirmar()
              }
            }}
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-pop"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn">
                <Paperclip className="size-5" />
              </span>
              <div>
                <h2 id="anexos-titulo" className="text-[16px] font-semibold">
                  Você anexou tudo na proposta?
                </h2>
                <p className="text-[13px] text-fg-2">Marque cada item para continuar.</p>
              </div>
            </div>

            <div className="grid gap-1.5">
              {lista.map((a) => {
                const on = marcados.has(a.chave)
                return (
                  <div
                    key={a.chave}
                    className={cx(
                      'rounded-xl border px-3 transition-colors duration-200',
                      on ? 'border-ok-line bg-ok-soft' : 'border-line bg-surface-2',
                    )}
                  >
                    <Checkbox
                      checked={on}
                      onChange={(v) =>
                        setMarcados((prev) => {
                          const next = new Set(prev)
                          if (v) next.add(a.chave)
                          else next.delete(a.chave)
                          return next
                        })
                      }
                      label={
                        <span className="flex flex-col py-1.5">
                          <span className="font-medium">{a.texto}</span>
                          {a.detalhe && <span className="text-[12px] text-fg-3">{a.detalhe}</span>}
                        </span>
                      }
                      className="w-full"
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-[12.5px] font-medium text-primary-ink hover:underline"
                onClick={() => setMarcados(new Set(lista.map((a) => a.chave)))}
              >
                Marcar todos
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fechar}>
                  Cancelar
                </Button>
                <Button variant="primary" disabled={!tudo} onClick={() => void confirmar()}>
                  {BOTAO[acao]}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Faixa fixa enquanto houver anexo sem confirmar. */
export function FaixaAnexos({ compacta }: { compacta?: boolean }) {
  const n = useCurrent()
  const pend = n && !n.excluidaEm ? anexosPendentes(n) : []
  return (
    <AnimatePresence initial={false}>
      {pend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div
            className={cx(
              'flex items-center gap-3 rounded-xl border border-warn-line bg-warn-soft',
              compacta ? 'px-3 py-2' : 'px-4 py-2.5',
            )}
          >
            <Paperclip className="size-4 shrink-0 text-warn" />
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg">
              <span className="font-semibold">Falta anexar: </span>
              <span className="text-fg-2">{pend.map((a) => a.texto.toLowerCase()).join(', ')}</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => pedirConferencia('confirmar')} className="shrink-0">
              Já anexei
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
