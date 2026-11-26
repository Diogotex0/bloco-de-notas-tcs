import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, ChevronDown, Minus, Plus } from 'lucide-react'
import type { Note } from '../lib/types'
import { analiseAnterior, comparar, type Mudanca } from '../lib/comparar'
import { fmtDate } from '../lib/dates'
import { irPara } from '../lib/actions'
import { useNotes } from '../store/notes'
import { cx } from './ui'

const estilo: Record<Mudanca['tipo'], { Icon: typeof Plus; cor: string }> = {
  novo: { Icon: Plus, cor: 'bg-ok-soft text-ok' },
  removido: { Icon: Minus, cor: 'bg-bad-soft text-bad' },
  mudou: { Icon: ArrowLeftRight, cor: 'bg-warn-soft text-warn' },
}

/** Para cliente recorrente: mostra o que mudou em relação à última análise do mesmo CNPJ. */
export function Comparacao({ n }: { n: Note }) {
  const notes = useNotes((s) => s.notes)
  const [aberto, setAberto] = useState(false)
  const temDados = n.grupos.length + n.docsRecebidos.length + n.docsApoio.length + n.filiais.length > 0
  const ant = useMemo(() => (temDados ? analiseAnterior(n, notes) : undefined), [n, notes, temDados])
  const mudancas = useMemo(() => (ant ? comparar(n, ant) : []), [n, ant])
  if (!ant) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">
            {mudancas.length ? `${mudancas.length} ${mudancas.length === 1 ? 'mudança' : 'mudanças'} desde a análise anterior` : 'Nada mudou desde a análise anterior'}
          </span>
          <span className="block truncate text-[12.5px] text-fg-3">
            Proposta {ant.proposta.trim() || 'sem número'} · {fmtDate(new Date(ant.updatedAt))}
          </span>
        </span>
        {mudancas.length > 0 && (
          <span className="hidden gap-1 sm:flex">
            {(['novo', 'mudou', 'removido'] as const).map((t) => {
              const q = mudancas.filter((m) => m.tipo === t).length
              if (!q) return null
              const { Icon, cor } = estilo[t]
              return (
                <span key={t} className={cx('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold', cor)}>
                  <Icon className="size-3" /> {q}
                </span>
              )
            })}
          </span>
        )}
        <ChevronDown className={cx('size-4 shrink-0 text-fg-3 transition-transform duration-300', !aberto && '-rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} className="overflow-hidden">
            <ul className="grid gap-1 border-t border-line px-3 py-3 sm:px-4">
              {mudancas.length === 0 && <li className="px-2 py-1 text-[13px] text-fg-2">Grupos, documentos e filiais estão iguais à análise anterior.</li>}
              {mudancas.map((m, i) => {
                const { Icon, cor } = estilo[m.tipo]
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => irPara({ sec: m.sec, target: `sec-${m.sec}` })}
                      className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug text-fg transition-colors hover:bg-surface-2"
                    >
                      <span className={cx('mt-px grid size-5 shrink-0 place-items-center rounded-md', cor)}>
                        <Icon className="size-3" />
                      </span>
                      {m.texto}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
