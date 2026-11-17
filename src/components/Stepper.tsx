import { motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import type { Note } from '../lib/types'
import type { Issue } from '../lib/analyze'
import { temConteudo } from '../lib/analyze'
import { SECTIONS } from '../lib/defaults'
import { irParaEtapa } from '../lib/teclado'
import { useUi } from '../store/ui'
import { IconButton, cx } from './ui'

/** Barra de etapas do modo foco: mostra o andamento e leva a qualquer etapa com um clique. */
export function Stepper({ n, issues }: { n: Note; issues: Issue[] }) {
  const aberta = useUi((s) => s.aberta) ?? 'proposta'
  const i = SECTIONS.findIndex((s) => s.key === aberta)

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-card">
      <IconButton label="Etapa anterior" disabled={i <= 0} onClick={() => i > 0 && irParaEtapa(SECTIONS[i - 1].key)} className="disabled:opacity-30">
        <ChevronLeft />
      </IconButton>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5">
        {SECTIONS.map((s, idx) => {
          const iss = issues.filter((x) => x.sec === s.key && x.level !== 'info')
          const bloq = iss.some((x) => x.level === 'block')
          const pend = iss.length > 0
          const ok = !bloq && !pend && (!s.optional || temConteudo(n, s.key))
          const atual = s.key === aberta
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => irParaEtapa(s.key)}
              title={`${idx + 1}. ${s.title}${bloq ? ' (bloqueado)' : pend ? ` (${iss.length} pendente${iss.length > 1 ? 's' : ''})` : ok ? ' (completa)' : ''}`}
              className={cx(
                'relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[12px] font-medium transition-colors',
                atual ? 'text-on-primary' : 'text-fg-2 hover:bg-surface-2',
              )}
            >
              {atual && (
                <motion.span layoutId="etapa-foco" className="absolute inset-0 rounded-xl bg-primary" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />
              )}
              <span
                className={cx(
                  'relative grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                  atual ? 'bg-white/20' : ok ? 'bg-ok-soft text-ok' : bloq ? 'bg-bad-soft text-bad' : pend ? 'bg-warn-soft text-warn' : 'bg-surface-3 text-fg-3',
                )}
              >
                {ok && !atual ? <Check className="size-3" strokeWidth={3} /> : bloq && !atual ? <Lock className="size-2.5" /> : idx + 1}
              </span>
              <span className={cx('relative hidden truncate xl:inline', !atual && 'max-w-[90px]')}>{s.title}</span>
            </button>
          )
        })}
      </div>
      <IconButton
        label="Próxima etapa"
        disabled={i >= SECTIONS.length - 1}
        onClick={() => i < SECTIONS.length - 1 && irParaEtapa(SECTIONS[i + 1].key)}
        className="disabled:opacity-30"
      >
        <ChevronRight />
      </IconButton>
    </div>
  )
}
