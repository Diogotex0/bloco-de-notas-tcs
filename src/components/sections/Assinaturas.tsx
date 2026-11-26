import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Plus, Trash2, Users } from 'lucide-react'
import type { Note, Regra } from '../../lib/types'
import { novaRegra } from '../../lib/defaults'
import { moneyDigits, moneyInput, moneyShort } from '../../lib/money'
import { regraTexto } from '../../lib/generate'
import { irPara, removerComDesfazer } from '../../lib/actions'
import { useNotes } from '../../store/notes'
import { Button, Callout, Checkbox, Field, IconButton, Reveal, Segmented, TextArea, TextInput, cx, inputBase, itemCard, itemMotion } from '../ui'
import { EmptyMini } from '../Section'

function CartaoRegra({ n, r, i }: { n: Note; r: Regra; i: number }) {
  const editar = useNotes((s) => s.editar)
  const set = (fn: (x: Regra) => void) =>
    editar((d) => {
      const x = d.regras.find((y) => y.id === r.id)
      if (x) fn(x)
    })

  return (
    <motion.div {...itemMotion} className={cx(itemCard, 'grid gap-3.5')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-fg-2">Forma {i + 1}</span>
        <IconButton
          label="Remover forma de assinatura"
          tone="danger"
          onClick={() => removerComDesfazer(`Forma de assinatura ${i + 1} removida`, (d) => void (d.regras = d.regras.filter((x) => x.id !== r.id)))}
        >
          <Trash2 />
        </IconButton>
      </div>

      <Field label="Quem assina">
        <div id={`${r.id}-grupos`} className="flex flex-wrap gap-1.5">
          {n.grupos.map((g) => {
            const on = r.grupos.includes(g.id)
            return (
              <motion.button
                key={g.id}
                type="button"
                layout
                whileTap={{ scale: 0.94 }}
                aria-pressed={on}
                onClick={() => set((x) => void (x.grupos = on ? x.grupos.filter((id) => id !== g.id) : [...x.grupos, g.id]))}
                className={cx(
                  'h-8 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors duration-150',
                  on
                    ? 'border-primary bg-primary text-on-primary shadow-[0_1px_2px_rgb(79_91_255/0.35)]'
                    : 'border-line-strong bg-surface text-fg-2 hover:border-primary/40 hover:text-fg',
                )}
              >
                {g.nome.trim() || 'Grupo sem nome'}
              </motion.button>
            )
          })}
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
        <Field label="Forma">
          <Segmented
            ariaLabel="Forma de assinatura"
            value={r.modo}
            onChange={(v) => set((x) => void (x.modo = v === 'conjunto' ? 'conjunto' : 'isolado'))}
            options={[
              { value: 'isolado' as const, label: 'Isolado' },
              { value: 'conjunto' as const, label: 'Em conjunto' },
            ]}
          />
        </Field>
        <Field
          label="Limite"
          htmlFor={`${r.id}-limite`}
          hint={!r.semLimite && r.limite ? <span className="text-fg-3">= {moneyShort(r.limite)}</span> : undefined}
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-fg-3">R$</span>
            <input
              id={`${r.id}-limite`}
              inputMode="numeric"
              autoComplete="off"
              placeholder={r.semLimite ? 'Sem limite' : '0'}
              disabled={r.semLimite}
              value={r.semLimite ? '' : moneyInput(r.limite)}
              onChange={(e) => set((x) => void (x.limite = moneyDigits(e.target.value)))}
              className={cx(inputBase, 'pl-9 tabular-nums')}
            />
          </div>
        </Field>
        <div className="flex items-end sm:pt-[22px]">
          <Checkbox checked={r.semLimite} onChange={(v) => set((x) => void (x.semLimite = v))} label="Sem limite" />
        </div>
      </div>

      <div>
        <Checkbox checked={r.requerAut} onChange={(v) => set((x) => void (x.requerAut = v))} label="Precisa de autorização" />
        <Reveal show={r.requerAut} className="pt-1">
          <Field label="Qual autorização?" htmlFor={`${r.id}-autorizacao`}>
            <TextInput
              id={`${r.id}-autorizacao`}
              value={r.autorizacao}
              placeholder="Ex.: aprovação do Conselho acima de R$ 5MM"
              onChange={(e) => set((x) => void (x.autorizacao = e.target.value))}
            />
          </Field>
        </Reveal>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2 text-[13px] text-fg-2">
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary-ink" />
        <span>{regraTexto(n, r)}</span>
      </div>
    </motion.div>
  )
}

export function Assinaturas({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const add = () => {
    const r = novaRegra()
    editar((d) => void d.regras.push(r))
  }

  return (
    <div className="grid gap-5">
      {!n.grupos.length ? (
        <Callout tone="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Cadastre os grupos na etapa 2 para montar as formas de assinatura.</span>
            <Button size="sm" variant="soft" onClick={() => irPara({ sec: 'grupos', target: 'add-grupo' })}>
              <Users /> Ir para grupos
            </Button>
          </div>
        </Callout>
      ) : (
        <div>
          <div className="relative grid gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {n.regras.map((r, i) => (
                <CartaoRegra key={r.id} n={n} r={r} i={i} />
              ))}
            </AnimatePresence>
            {!n.regras.length && (
              <EmptyMini>Nenhuma forma de assinatura ainda.</EmptyMini>
            )}
          </div>
          <Button variant="soft" className="mt-3" onClick={add}>
            <Plus /> Adicionar forma de assinatura
          </Button>
        </div>
      )}

      <Field label="Quóruns e autorizações" htmlFor="f-quoruns">
        <TextArea
          id="f-quoruns"
          value={n.quoruns}
          placeholder="Escreva aqui os quóruns e as autorizações…"
          onChange={(e) => editar((d) => void (d.quoruns = e.target.value))}
        />
      </Field>
    </div>
  )
}
