import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Lock, StickyNote, X } from 'lucide-react'
import type { Issue } from '../lib/analyze'
import type { SectionKey } from '../lib/types'
import { useUi } from '../store/ui'
import { irParaEtapa } from '../lib/teclado'
import { Button, TextArea, cx } from './ui'

/** Uma etapa da anotação: uma linha numerada (01, 02…) que abre o formulário logo abaixo. */
export function Section({
  k,
  index,
  title,
  desc,
  summary,
  optional,
  issues,
  hasContent,
  next,
  nota = '',
  onNota,
  children,
}: {
  k: SectionKey
  index: number
  title: string
  desc: string
  summary: string
  optional?: boolean
  issues: Issue[]
  hasContent: boolean
  next?: { key: SectionKey; title: string }
  nota?: string
  onNota?: (v: string) => void
  children: ReactNode
}) {
  const aberta = useUi((s) => s.aberta === k)
  const alternar = useUi((s) => s.alternarEtapa)
  const [escrevendo, setEscrevendo] = useState(false)
  const mostrarNota = !!onNota && (escrevendo || !!nota.trim())

  const bloqueada = issues.some((i) => i.level === 'block')
  const pend = issues.filter((i) => i.level === 'warn').length
  const completa = !bloqueada && !pend && (!optional || hasContent)

  // Fechada: mostra o resumo do que já foi preenchido. Aberta: mostra para que serve a etapa.
  const subtitulo = !aberta && summary ? summary : desc
  const numero = String(index).padStart(2, '0')

  return (
    <section
      id={`sec-${k}`}
      className={cx(
        'relative scroll-mt-[76px] border-t border-line bg-surface first:border-t-0',
        aberta && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
        bloqueada && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-bad',
      )}
    >
      <button
        type="button"
        onClick={() => alternar(k)}
        aria-expanded={aberta}
        className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 sm:px-5"
      >
        <span
          className={cx(
            'text-[13px] font-semibold tabular-nums',
            bloqueada ? 'text-bad' : aberta ? 'text-primary-ink' : completa ? 'text-fg' : 'text-fg-3',
          )}
        >
          {numero}
        </span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-semibold text-fg">{title}</span>
            {optional && <span className="text-[12px] text-fg-3">opcional</span>}
          </span>
          <span className={cx('mt-0.5 block truncate text-[13px]', !aberta && summary ? 'text-fg-2' : 'text-fg-3')}>{subtitulo}</span>
        </span>
        <span className="flex items-center gap-3 self-center">
          {!aberta && nota.trim() && (
            <span title={`Nota rápida: ${nota.trim()}`} className="text-warn">
              <StickyNote className="size-3.5" />
            </span>
          )}
          {bloqueada ? (
            <span className="flex items-center gap-1 text-[12.5px] font-medium text-bad">
              <Lock className="size-3.5" /> Bloqueado
            </span>
          ) : pend > 0 ? (
            <span className="text-[12.5px] font-medium text-warn tabular-nums">
              {pend} {pend === 1 ? 'pendente' : 'pendentes'}
            </span>
          ) : completa ? (
            <span className="flex items-center gap-1 text-[12.5px] font-medium text-ok">
              <Check className="size-3.5" strokeWidth={2.5} /> Ok
            </span>
          ) : null}
          <ChevronDown className={cx('size-4 shrink-0 text-fg-3 transition-transform duration-150', !aberta && '-rotate-90')} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pt-1 pb-5 sm:pr-5 sm:pl-[4.25rem]">
              {children}

              {/* Nota rápida: lembrete do analista, não entra no texto final */}
              {mostrarNota && (
                <div className="mt-5 border-l-2 border-warn pl-3" data-flash>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor={`nota-${k}`} className="text-[12.5px] font-medium text-fg-2">
                      Nota rápida <span className="font-normal text-fg-3">(não vai para o texto)</span>
                    </label>
                    <button
                      type="button"
                      aria-label="Apagar nota rápida"
                      title="Apagar nota rápida"
                      onClick={() => {
                        onNota?.('')
                        setEscrevendo(false)
                      }}
                      className="grid size-6 place-items-center rounded-sm text-fg-3 hover:bg-surface-3 hover:text-fg"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <TextArea
                    id={`nota-${k}`}
                    data-pular
                    value={nota}
                    autoFocus={escrevendo && !nota}
                    placeholder="Ex.: pedir ata atualizada ao cliente"
                    onChange={(e) => onNota?.(e.target.value)}
                    onBlur={() => !nota.trim() && setEscrevendo(false)}
                    className="min-h-[60px] text-[13px]"
                  />
                </div>
              )}

              {(next || (onNota && !mostrarNota)) && (
                <div className="mt-6 flex items-center justify-end gap-3">
                  {onNota && !mostrarNota && (
                    <button
                      type="button"
                      onClick={() => setEscrevendo(true)}
                      className="mr-auto text-[12.5px] text-fg-3 underline-offset-2 hover:text-fg hover:underline"
                    >
                      + Nota rápida
                    </button>
                  )}
                  {next && pend > 0 && <span className="hidden text-[12px] text-fg-3 sm:inline">Dá para seguir e voltar depois</span>}
                  {next && (
                    <Button variant="primary" size="sm" onClick={() => irParaEtapa(next.key)} title="Atalho: Ctrl + Enter">
                      Próximo: {next.title} <ArrowRight />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function SubHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-2.5">
      <h4 className="text-[13px] font-semibold text-fg">{title}</h4>
      {desc && <p className="text-[12.5px] text-fg-3">{desc}</p>}
    </div>
  )
}

export function EmptyMini({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line-strong px-4 py-4 text-center text-[13px] text-fg-3">{children}</div>
}
