import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import type { Grupo, Note } from '../../lib/types'
import { SUGESTOES_GRUPO, novoGrupo } from '../../lib/defaults'
import { parseISO, today } from '../../lib/dates'
import { removerComDesfazer } from '../../lib/actions'
import { useNotes } from '../../store/notes'
import { porId } from '../../lib/janela'
import { Button, Checkbox, Field, IconButton, Tag, TextInput, cx, itemCard, itemMotion } from '../ui'
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

  return (
    <div className="grid gap-3">
      <div className="relative grid gap-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {n.grupos.map((g, i) => {
            const ini = parseISO(g.inicio)
            const fim = !g.indeterminado ? parseISO(g.duracao) : null
            const invertido = !!(ini && fim && fim < ini)
            const vencido = !invertido && !!fim && fim < today()
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
                        d.regras.forEach((r) => (r.grupos = r.grupos.filter((id) => id !== g.id)))
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
                {(invertido || vencido) && (
                  <div>
                    <Tag tone="bad">{invertido ? 'O fim está antes do início' : 'Mandato vencido'}</Tag>
                  </div>
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
              className="h-8 rounded-full border border-line-strong bg-surface px-3 text-[12px] font-medium text-fg-2 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary-ink active:scale-95"
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
