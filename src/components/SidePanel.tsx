import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleAlert, Copy, Info, Lock, Settings2 } from 'lucide-react'
import type { Note } from '../lib/types'
import type { Issue } from '../lib/analyze'
import { temConteudo } from '../lib/analyze'
import { SECTIONS } from '../lib/defaults'
import { blocoDocumentos, blocoFiliais, blocoGrupos, gerarTexto } from '../lib/generate'
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
    <div className="flex flex-col rounded-md border border-line bg-surface xl:sticky xl:top-[76px] xl:max-h-[calc(100dvh-92px)]">
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
        <div className="mt-2 h-0.5 overflow-hidden bg-surface-3">
          <motion.div
            className={cx('h-full', bloqueado ? 'bg-bad' : pct === 100 ? 'bg-ok' : 'bg-primary')}
            initial={false}
            animate={{ width: `${Math.max(pct, 3)}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Abas */}
      <div className="mt-3 flex items-center gap-4 border-b border-line px-4">
        {abas.map((a) => (
          <button
            key={a.k}
            type="button"
            onClick={() => setAba(a.k)}
            className={cx(
              'relative flex h-10 items-center gap-1.5 px-1 text-[13px] font-medium transition-colors',
              aba === a.k ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            {a.label}
            {!!a.badge && (
              <span className={cx('text-[12px] font-semibold tabular-nums', bloqueado ? 'text-bad' : 'text-warn')}>
                {a.badge}
              </span>
            )}
            {aba === a.k && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-fg" />}
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
            <motion.ul key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="relative grid gap-0.5">
              <AnimatePresence initial={false} mode="popLayout">
                {issues.map((i) => {
                  const Ic = icone[i.level]
                  return (
                    <motion.li
                      key={i.level + i.target + i.msg}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.14 }}
                    >
                      <button
                        type="button"
                        onClick={() => irPara(i)}
                        className={cx(
                          'flex w-full items-start gap-2.5 rounded-sm px-2 py-1.5 text-left text-[13px] leading-snug text-fg transition-colors hover:bg-surface-3',
                          i.level === 'block' && 'font-medium',
                        )}
                      >
                        <Ic className={cx('mt-px size-[15px] shrink-0', cor[i.level])} />
                        <span>{i.msg}</span>
                      </button>
                    </motion.li>
                  )
                })}
                {!issues.length && (
                  <motion.li key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-ok">
                    <Check className="size-4" /> Nenhuma pendência
                  </motion.li>
                )}
              </AnimatePresence>
              {issues.length > 0 && <p className="px-2.5 pt-2 text-[12px] text-fg-3">Clique num item para ir até o campo.</p>}
            </motion.ul>
          ) : (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={abrirEditorModelo}
                  title="Mudar a ordem, os rótulos e as frases do texto"
                  className="order-last ml-auto inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-[12px] font-medium text-fg-2 hover:bg-surface-3 hover:text-fg"
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
                      className="inline-flex h-7 items-center gap-1 rounded-sm border border-line-strong bg-surface px-2 text-[12px] font-medium text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Copy className="size-3" /> {p.nome}
                    </button>
                  )
                })}
              </div>
              <pre className="rounded-md border border-line bg-surface-2 p-3.5 font-mono text-[12.5px] leading-[1.65] break-words whitespace-pre-wrap text-fg">
                {gerarTexto(n, modelo)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
