import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import type { Grupo, Note } from '../../lib/types'
import { PRORROGACAO_DIAS, SUGESTOES_GRUPO, novoGrupo } from '../../lib/defaults'
import { fmtDate, parseISO, toISO, today } from '../../lib/dates'
import { excessoSubstabelecimento, fimDiretoria, podeProrrogar, procuracaoSemPrazoSA, temProrrogacao, vigencia } from '../../lib/mandato'
import { removerComDesfazer } from '../../lib/actions'
import { useNotes } from '../../store/notes'
import { porId } from '../../lib/janela'
import { Button, Callout, Checkbox, Field, IconButton, Select, Tag, TextInput, cx, itemCard, itemMotion } from '../ui'
import { DateInput } from '../DateInput'

export function Grupos({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)

  const adicionar = (nome = '') => {
    const g = novoGrupo(nome)
    editar((d) => void d.grupos.push(g))
    window.setTimeout(() => porId(nome ? `${g.id}-inicio` : `${g.id}-nome`)?.focus(), 60)
  }

  const set = (id: string, fn: (g: Grupo) => void) =>
    editar((d) => {
      const g = d.grupos.find((x) => x.id === id)
      if (g) fn(g)
    })

  // O campo "recebeu por substabelecimento" só aparece quando faz sentido.
  const temSubstab = n.docsRecebidos.some((d) => d.tipo === 'Substabelecimento') || n.grupos.some((g) => g.substabeleceuDe)
  const limiteDiretoria = fimDiretoria(n)

  return (
    <div className="grid gap-3">
      <div className="relative grid gap-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {n.grupos.map((g, i) => {
            const ini = parseISO(g.inicio)
            const fim = !g.indeterminado ? parseISO(g.duracao) : null
            const invertido = !!(ini && fim && fim < ini)
            const vig = vigencia(g)
            const vencido = !invertido && !!vig && vig < today()
            const semPrazoSA = procuracaoSemPrazoSA(n, g)
            const excesso = excessoSubstabelecimento(n, g)
            const outros = n.grupos.filter((x) => x.id !== g.id)
            return (
              <motion.div key={g.id} {...itemMotion} className={cx(itemCard, 'grid gap-3')}>
                <div className="flex items-end gap-2">
                  <Field label="Nome do grupo" htmlFor={`${g.id}-nome`} className="flex-1">
                    <TextInput
                      id={`${g.id}-nome`}
                      value={g.nome}
                      list="sugestoes-grupo"
                      placeholder="Ex.: DIRETOR"
                      onChange={(e) => set(g.id, (x) => void (x.nome = e.target.value))}
                    />
                  </Field>
                  <IconButton
                    label="Remover grupo"
                    tone="danger"
                    className="mb-0.5"
                    onClick={() =>
                      removerComDesfazer(`Grupo ${g.nome.trim() || i + 1} removido`, (d) => {
                        d.grupos = d.grupos.filter((x) => x.id !== g.id)
                      })
                    }
                  >
                    <Trash2 />
                  </IconButton>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                  <Field label="Início do mandato" htmlFor={`${g.id}-inicio`}>
                    <DateInput id={`${g.id}-inicio`} value={g.inicio} onChange={(v) => set(g.id, (x) => void (x.inicio = v))} />
                  </Field>
                  <Field label="Fim do mandato" htmlFor={`${g.id}-duracao`}>
                    <DateInput
                      id={`${g.id}-duracao`}
                      value={g.indeterminado ? '' : g.duracao}
                      disabled={g.indeterminado}
                      aria-invalid={invertido || vencido}
                      onChange={(v) => set(g.id, (x) => void (x.duracao = v))}
                    />
                  </Field>
                  <Checkbox
                    id={`${g.id}-indet`}
                    checked={g.indeterminado}
                    onChange={(v) => set(g.id, (x) => void (x.indeterminado = v))}
                    label="Indeterminado"
                  />
                </div>
                {podeProrrogar(g) && (
                  <div>
                    <Checkbox
                      id={`${g.id}-prorrogacao`}
                      checked={g.prorrogacao}
                      onChange={(v) => set(g.id, (x) => void (x.prorrogacao = v))}
                      label={`Somar ${PRORROGACAO_DIAS} dias de prorrogação automática`}
                    />
                    {temProrrogacao(g) && (
                      <p className="text-[12.5px] text-fg-2">
                        Vigente até <strong className="font-semibold text-fg tabular-nums">{fmtDate(vig)}</strong>. Vai no texto e no follow-up.
                      </p>
                    )}
                  </div>
                )}

                {temSubstab && outros.length > 0 && (
                  <Field label="Recebeu os poderes por substabelecimento de" htmlFor={`${g.id}-substab`} optional>
                    <Select
                      id={`${g.id}-substab`}
                      value={g.substabeleceuDe}
                      onChange={(e) => set(g.id, (x) => void (x.substabeleceuDe = e.target.value))}
                      options={[['', 'Não veio de substabelecimento'], ...outros.map((o, j): [string, string] => [o.id, o.nome.trim() || `Grupo ${n.grupos.indexOf(o) + 1 || j + 1}`])]}
                    />
                  </Field>
                )}

                {(invertido || vencido) && (
                  <div>
                    <Tag tone="bad">{invertido ? 'O fim está antes do início' : 'Mandato vencido'}</Tag>
                  </div>
                )}

                {semPrazoSA && (
                  <Callout tone="warn">
                    Em S/A, procuração sem prazo (ou “por prazo indeterminado”) é cadastrada até o fim do mandato da diretoria, se o estatuto não
                    definir outro prazo (art. 144, parágrafo único, da Lei das S/A).
                    {limiteDiretoria ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            set(g.id, (x) => {
                              x.indeterminado = false
                              x.duracao = toISO(limiteDiretoria)
                            })
                          }
                        >
                          Usar {fmtDate(limiteDiretoria)} (fim da diretoria)
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-fg-2">Cadastre o grupo da diretoria com o fim do mandato para o bloco sugerir a data.</p>
                    )}
                  </Callout>
                )}

                {excesso && (
                  <Callout tone="warn">
                    O substabelecimento não pode valer por mais tempo que {excesso.origem.nome.trim() || 'quem substabeleceu'}, que vai até{' '}
                    {fmtDate(excesso.limite)}.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          set(g.id, (x) => {
                            x.indeterminado = false
                            x.duracao = toISO(excesso.limite)
                          })
                        }
                      >
                        Ajustar para {fmtDate(excesso.limite)}
                      </Button>
                    </div>
                  </Callout>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button id="add-grupo" variant="soft" onClick={() => adicionar()}>
          <Plus /> Adicionar grupo
        </Button>
        {/* Atalhos só aparecem enquanto não há grupos, para não poluir a tela */}
        {!n.grupos.length &&
          SUGESTOES_GRUPO.slice(0, 3).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="h-8 rounded-full border border-line-strong bg-surface px-3 text-[12px] font-medium text-fg-2 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary-ink"
            >
              + {s}
            </button>
          ))}
      </div>
      <datalist id="sugestoes-grupo">
        {SUGESTOES_GRUPO.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
