import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Lock } from 'lucide-react'
import type { Issue } from '../lib/analyze'
import type { SectionKey } from '../lib/types'
import { useUi } from '../store/ui'
import { irParaEtapa } from '../lib/teclado'
import { Button, cx, Tag } from './ui'

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
  children: ReactNode
}) {
  const aberta = useUi((s) => s.aberta === k)
  const alternar = useUi((s) => s.alternarEtapa)

  const bloqueada = issues.some((i) => i.level === 'block')
  const pend = issues.filter((i) => i.level === 'warn').length
  const completa = !bloqueada && !pend && (!optional || hasContent)

  // Fechada: mostra o resumo do que já foi preenchido. Aberta: mostra para que serve a etapa.
  const subtitulo = !aberta && summary ? summary : desc

  return (
    <section
      id={`sec-${k}`}
      className={cx(
        'scroll-mt-[84px] rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-300',
        aberta ? 'shadow-pop' : 'shadow-card',
        bloqueada ? 'border-bad-line' : aberta ? 'border-primary/30' : 'border-line hover:border-line-strong',
      )}
    >
      <button
        type="button"
        onClick={() => alternar(k)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left sm:px-5"
      >
        <span
          className={cx(
            'grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors duration-300',
            completa ? 'bg-ok-soft text-ok' : bloqueada ? 'bg-bad-soft text-bad' : aberta ? 'bg-primary text-on-primary' : 'bg-surface-3 text-fg-2',
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={completa ? 'ok' : bloqueada ? 'lock' : 'n'}
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="grid place-items-center"
            >
              {completa ? <Check className="size-4" strokeWidth={2.75} /> : bloqueada ? <Lock className="size-3.5" /> : index}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</span>
            {optional && <span className="text-[11.5px] font-normal text-fg-3">opcional</span>}
          </span>
          <span className={cx('block truncate text-[12.5px]', !aberta && summary ? 'text-fg-2' : 'text-fg-3')}>{subtitulo}</span>
        </span>
        {!aberta && bloqueada && <Tag tone="bad">Bloqueado</Tag>}
        {!aberta && !bloqueada && pend > 0 && <Tag tone="warn">{pend} {pend === 1 ? 'pendente' : 'pendentes'}</Tag>}
        <ChevronDown className={cx('size-4 shrink-0 text-fg-3 transition-transform duration-300', !aberta && '-rotate-90')} />
      </button>

      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pt-1 pb-4 sm:px-5">
              {children}
              {next && (
                <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
                  {pend > 0 && <span className="text-[12px] text-fg-3">Dá para seguir e voltar depois</span>}
                  <Button variant="primary" size="sm" onClick={() => irParaEtapa(next.key)} title="Atalho: Ctrl + Enter">
                    {next.title} <ArrowRight />
                    <kbd className="ml-0.5 hidden rounded bg-white/15 px-1 font-mono text-[10px] font-medium sm:inline">Ctrl ↵</kbd>
                  </Button>
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
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-4 py-4 text-center text-[13px] text-fg-3">
      {children}
    </div>
  )
}
