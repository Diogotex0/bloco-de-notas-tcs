import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, CircleDashed, Lock, PenLine, StickyNote, X } from 'lucide-react'
import { analisar } from '../lib/analyze'
import { anexosPendentes } from '../lib/anexos'
import { gerarTexto } from '../lib/generate'
import { irPara } from '../lib/actions'
import { janela } from '../lib/janela'
import { linhasRevisao, useRevisao } from '../lib/revisao'
import { SECTIONS } from '../lib/defaults'
import { pedirConferencia } from '../store/anexos'
import { useCurrent, useNotes } from '../store/notes'
import { toast } from '../store/toast'
import { useModelo } from '../store/modelo'
import { CopyButton } from './CopyButton'
import { Button, IconButton, cx } from './ui'

/** Tela de revisão: o que foi preenchido de um lado, o texto final do outro. */
export function RevisaoDialog() {
  const aberta = useRevisao((s) => s.aberta)
  const modelo = useModelo((s) => s.modelo)
  const n = useCurrent()
  const fechar = () => useRevisao.setState({ aberta: false })

  useEffect(() => {
    if (!aberta) return
    const w = janela()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
  }, [aberta])

  if (!n) return null
  const issues = analisar(n)
  const bloqueado = issues.some((i) => i.level === 'block')
  const pend = issues.filter((i) => i.level === 'warn').length
  const etapas = linhasRevisao(n)
  const notas = SECTIONS.filter((s) => n.notasEtapa[s.key]?.trim())

  const finalizar = () => {
    if (bloqueado) {
      const b = issues.find((i) => i.level === 'block')!
      fechar()
      irPara(b)
      toast(`${b.msg}. Resolva antes de finalizar.`, { type: 'danger' })
      return
    }
    fechar()
    if (anexosPendentes(n).length) {
      pedirConferencia('finalizar')
      return
    }
    useNotes.getState().editar((d) => void (d.situacao = 'finalizada'))
    toast('Anotação finalizada. Ela fica na aba “Finalizadas”.', { type: 'success' })
  }

  const corrigir = (sec: (typeof etapas)[number]['key']) => {
    fechar()
    const alvo = issues.find((i) => i.sec === sec && i.level !== 'info')
    irPara(alvo ?? { sec, target: `sec-${sec}` })
  }

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center bg-black/40 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fechar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revisao-titulo"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          >
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 id="revisao-titulo" className="truncate text-[16px] font-semibold">
                  Revisão · {n.razaoSocial.trim() || 'Sem razão social'}
                </h2>
                <p className={cx('text-[12.5px]', bloqueado ? 'text-bad' : pend ? 'text-warn' : 'text-ok')}>
                  {bloqueado ? 'Há um bloqueio a resolver' : pend ? `${pend} ${pend === 1 ? 'pendência' : 'pendências'} em aberto` : 'Tudo preenchido'}
                </p>
              </div>
              <IconButton label="Fechar revisão" onClick={fechar}>
                <X />
              </IconButton>
            </div>

            {/* Corpo: preenchido × texto final */}
            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
              <div className="min-h-0 border-line p-5 lg:overflow-y-auto lg:border-r">
                <h3 className="mb-3 text-[12px] font-semibold text-fg-2">O que foi preenchido</h3>
                <div className="grid gap-3">
                  {etapas.map((e, idx) => {
                    const iss = issues.filter((i) => i.sec === e.key && i.level !== 'info')
                    const bloq = iss.some((i) => i.level === 'block')
                    return (
                      <div key={e.key} className={cx('rounded-xl border p-3', bloq ? 'border-bad-line' : iss.length ? 'border-warn-line' : 'border-line')}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-fg-3 tabular-nums">{idx + 1}</span>
                          <span className="flex-1 text-[13.5px] font-semibold">{e.titulo}</span>
                          {bloq ? (
                            <Lock className="size-4 text-bad" />
                          ) : iss.length ? (
                            <CircleAlert className="size-4 text-warn" />
                          ) : (
                            <CircleCheck className="size-4 text-ok" />
                          )}
                          <button
                            type="button"
                            onClick={() => corrigir(e.key)}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-primary-ink hover:bg-primary-soft"
                          >
                            <PenLine className="size-3" /> Editar
                          </button>
                        </div>
                        <dl className="grid gap-1">
                          {e.linhas.map((l, i) => (
                            <div key={i} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2 text-[13px]">
                              <dt className="truncate text-fg-3">{l.rotulo}</dt>
                              <dd className={cx('min-w-0 break-words', l.valor ? 'text-fg' : 'flex items-center gap-1 text-fg-3 italic')}>
                                {l.valor || (
                                  <>
                                    <CircleDashed className="size-3 shrink-0" /> {l.opcional ? 'em branco (opcional)' : 'em branco'}
                                  </>
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {iss.length > 0 && (
                          <ul className="mt-2 grid gap-0.5 border-t border-line pt-2">
                            {iss.map((i) => (
                              <li key={i.target + i.msg} className={cx('text-[12.5px]', i.level === 'block' ? 'text-bad' : 'text-warn')}>
                                • {i.msg}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}

                  {notas.length > 0 && (
                    <div className="rounded-xl border border-dashed border-warn-line bg-warn-soft p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-warn">
                        <StickyNote className="size-4" /> Suas notas rápidas (não vão no texto)
                      </p>
                      {notas.map((s) => (
                        <p key={s.key} className="text-[13px] text-fg">
                          <span className="text-fg-3">{s.title}:</span> {n.notasEtapa[s.key]}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col p-5">
                <h3 className="mb-3 text-[12px] font-semibold text-fg-2">Texto que vai para o Salesforce</h3>
                <pre className="min-h-[200px] flex-1 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[12.5px] leading-[1.7] break-words whitespace-pre-wrap text-fg">
                  {gerarTexto(n, modelo)}
                </pre>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">
              <Button variant="outline" onClick={fechar} className="mr-auto">
                Voltar e editar
              </Button>
              <CopyButton bloqueado={bloqueado} variant="soft" />
              {n.situacao !== 'finalizada' && (
                <Button variant="primary" onClick={finalizar}>
                  <CircleCheck /> Finalizar
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
