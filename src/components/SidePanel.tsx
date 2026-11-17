import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Copy, Info, Lock, PartyPopper, Settings2 } from 'lucide-react'
import type { Note } from '../lib/types'
import type { Issue } from '../lib/analyze'
import { temConteudo } from '../lib/analyze'
import { SECTIONS } from '../lib/defaults'
import { blocoAssinaturas, blocoDocumentos, blocoFiliais, blocoGrupos, gerarTexto } from '../lib/generate'
import { copiarTexto, irPara } from '../lib/actions'
import { toast } from '../store/toast'
import { abrirEditorModelo, useModelo } from '../store/modelo'
import { CopyButton } from './CopyButton'
import { cx } from './ui'

const icone = { block: Lock, warn: CircleAlert, info: Info }
const cor = { block: 'text-bad', warn: 'text-warn', info: 'text-primary-ink' }

type Aba = 'pendencias' | 'texto'

const PARTES: { nome: string; genero: 'o' | 'a'; gerar: (n: Note) => string[] }[] = [
  { nome: 'Grupos', genero: 'o', gerar: blocoGrupos },
  { nome: 'Documentos', genero: 'o', gerar: blocoDocumentos },
  { nome: 'Filiais', genero: 'a', gerar: blocoFiliais },
  { nome: 'Assinaturas', genero: 'a', gerar: blocoAssinaturas },
]

export function SidePanel({ n, issues }: { n: Note; issues: Issue[] }) {
  const [aba, setAba] = useState<Aba>('pendencias')
  const modelo = useModelo((s) => s.modelo)
  const obrig = SECTIONS.filter((s) => !s.optional)
  const prontas = obrig.filter((s) => !issues.some((i) => i.sec === s.key && i.level !== 'info') && temConteudo(n, s.key)).length
  const pct = Math.round((prontas / obrig.length) * 100)
  const bloqueado = issues.some((i) => i.level === 'block')
  const pend = issues.filter((i) => i.level !== 'info').length

  const abas: { k: Aba; label: string; badge?: number }[] = [
    { k: 'pendencias', label: 'Pendências', badge: pend },
    { k: 'texto', label: 'Texto final' },
  ]

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface shadow-card xl:sticky xl:top-[84px] xl:max-h-[calc(100dvh-100px)]">
      {/* Progresso */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className={cx('font-medium', bloqueado ? 'text-bad' : pct === 100 ? 'text-ok' : 'text-fg-2')}>
            {bloqueado ? 'Cópia bloqueada' : pct === 100 ? 'Pronto para copiar' : 'Progresso'}
          </span>
          <span className="text-fg-3 tabular-nums">
            {prontas} de {obrig.length} etapas
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className={cx('h-full rounded-full', bloqueado ? 'bg-bad' : pct === 100 ? 'bg-ok' : 'bg-primary')}
            initial={false}
            animate={{ width: `${Math.max(pct, 3)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Abas */}
      <div className="mt-3 flex items-center gap-1 border-b border-line px-3">
        {abas.map((a) => (
          <button
            key={a.k}
            type="button"
            onClick={() => setAba(a.k)}
            className={cx(
              'relative flex h-10 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors',
              aba === a.k ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            {a.label}
            {!!a.badge && (
              <span className={cx('grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold tabular-nums', bloqueado ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>
                {a.badge}
              </span>
            )}
            {aba === a.k && <motion.span layoutId="aba-painel" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
        <div className="ml-auto py-1.5">
          <CopyButton bloqueado={bloqueado} label="Copiar" variant="soft" size="sm" />
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait" initial={false}>
          {aba === 'pendencias' ? (
            <motion.ul key="p" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }} className="relative grid gap-0.5">
              <AnimatePresence initial={false} mode="popLayout">
                {issues.map((i) => {
                  const Ic = icone[i.level]
                  return (
                    <motion.li
                      key={i.level + i.target + i.msg}
                      layout="position"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8, transition: { duration: 0.14 } }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    >
                      <button
                        type="button"
                        onClick={() => irPara(i)}
                        className={cx(
                          'flex w-full items-start gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] leading-snug text-fg transition-colors',
                          i.level === 'block' ? 'bg-bad-soft hover:brightness-[0.98]' : 'hover:bg-surface-2',
                        )}
                      >
                        <Ic className={cx('mt-px size-[15px] shrink-0', cor[i.level])} />
                        <span>{i.msg}</span>
                      </button>
                    </motion.li>
                  )
                })}
                {!issues.length && (
                  <motion.li key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2.5 rounded-[9px] bg-ok-soft px-3 py-2.5 text-[13px] font-medium text-ok">
                    <PartyPopper className="size-4" /> Nenhuma pendência
                  </motion.li>
                )}
              </AnimatePresence>
              {issues.length > 0 && <p className="px-2.5 pt-2 text-[12px] text-fg-3">Clique num item para ir até o campo.</p>}
            </motion.ul>
          ) : (
            <motion.div key="t" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}>
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={abrirEditorModelo}
                  title="Mudar a ordem, os rótulos e as frases do texto"
                  className="order-last ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-primary-ink hover:bg-primary-soft"
                >
                  <Settings2 className="size-3.5" /> Editar modelo
                </button>
                <span className="mr-0.5 text-[12px] text-fg-3">Copiar só:</span>
                {PARTES.map((p) => {
                  const linhas = p.gerar(n)
                  return (
                    <button
                      key={p.nome}
                      type="button"
                      disabled={!linhas.length}
                      onClick={async () => {
                        const ok = await copiarTexto(linhas.join('\n'))
                        toast(ok ? `${p.nome} copiad${p.genero}s` : 'Não foi possível copiar', { type: ok ? 'success' : 'danger', duration: 2200 })
                      }}
                      title={linhas.length ? `Copiar só ${p.nome.toLowerCase()}` : `Sem ${p.nome.toLowerCase()} preenchid${p.genero}s`}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 text-[12px] font-medium text-fg-2 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Copy className="size-3" /> {p.nome}
                    </button>
                  )
                })}
              </div>
              <pre className="rounded-xl bg-surface-2 p-3.5 font-mono text-[12.25px] leading-[1.7] break-words whitespace-pre-wrap text-fg-2">
                {gerarTexto(n, modelo)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
