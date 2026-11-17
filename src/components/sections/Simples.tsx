import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock } from 'lucide-react'
import type { Note } from '../../lib/types'
import { vencimento } from '../../lib/analyze'
import { fmtDate } from '../../lib/dates'
import { useNotes } from '../../store/notes'
import { DATA_BASE_GARANTIAS } from '../../lib/defaults'
import { Checkbox, Field, Segmented, Select, Tag, TextArea, cx, inputBase } from '../ui'
import { DateInput } from '../DateInput'

/* ---------- Validade da outorga ---------- */
export function Outorga({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const o = n.outorga
  const v = vencimento(o)

  let resultado: { tone: 'ok' | 'warn' | 'bad' | 'muted'; titulo: string; detalhe: string; tag?: string }
  if (!v) resultado = { tone: 'muted', titulo: 'Vencimento', detalhe: 'Informe a data de emissão e a validade' }
  else if ('indeterminada' in v) resultado = { tone: 'ok', titulo: 'Prazo indeterminado', detalhe: 'Sem data de vencimento', tag: 'Vigente' }
  else if (v.days < 0)
    resultado = { tone: 'bad', titulo: `Venceu em ${fmtDate(v.date)}`, detalhe: `Há ${-v.days} ${v.days === -1 ? 'dia' : 'dias'}`, tag: 'Vencida' }
  else if (v.days <= 30)
    resultado = { tone: 'warn', titulo: `Vence em ${fmtDate(v.date)}`, detalhe: v.days === 0 ? 'Vence hoje' : `Faltam ${v.days} ${v.days === 1 ? 'dia' : 'dias'}`, tag: 'Vence logo' }
  else resultado = { tone: 'ok', titulo: `Vence em ${fmtDate(v.date)}`, detalhe: `Faltam ${v.days} dias`, tag: 'Vigente' }

  const caixa = {
    ok: 'border-ok-line bg-ok-soft text-ok',
    warn: 'border-warn-line bg-warn-soft text-warn',
    bad: 'border-bad-line bg-bad-soft text-bad',
    muted: 'border-line bg-surface-2 text-fg-3',
  }[resultado.tone]

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Field label="Data de emissão" htmlFor="f-emissao">
          <DateInput
            id="f-emissao"
            value={o.emissao}
            disabled={o.indeterminada}
            onChange={(val) => editar((d) => void (d.outorga.emissao = val))}
          />
        </Field>
        <Field label="Validade" htmlFor="f-qtd">
          <div className="flex gap-2">
            <input
              id="f-qtd"
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              value={o.qtd}
              disabled={o.indeterminada}
              onChange={(e) => editar((d) => void (d.outorga.qtd = e.target.value.replace(/\D/g, '').slice(0, 2)))}
              className={cx(inputBase, 'w-20 text-center tabular-nums')}
            />
            <div className="flex-1">
              <Select
                aria-label="Unidade da validade"
                value={o.unidade}
                disabled={o.indeterminada}
                onChange={(e) => editar((d) => void (d.outorga.unidade = e.target.value === 'meses' ? 'meses' : 'anos'))}
                options={[
                  ['anos', 'ano(s)'],
                  ['meses', 'mês(es)'],
                ]}
              />
            </div>
          </div>
        </Field>
        <div className="flex items-end sm:pt-[22px]">
          <Checkbox
            id="f-indeterminada"
            checked={o.indeterminada}
            onChange={(val) => editar((d) => void (d.outorga.indeterminada = val))}
            label="Prazo indeterminado"
          />
        </div>
      </div>

      <motion.div layout className={cx('flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300', caixa)}>
        <CalendarClock className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={resultado.titulo} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              <p className="text-[14px] font-semibold text-fg tabular-nums">{resultado.titulo}</p>
              <p className="text-[12.5px] text-fg-2">{resultado.detalhe}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        {resultado.tag && <Tag tone={resultado.tone === 'muted' ? 'muted' : resultado.tone}>{resultado.tag}</Tag>}
      </motion.div>
    </div>
  )
}

/* ---------- Garantidor ---------- */
export function Garantidor({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="O cliente é garantidor?">
          <Segmented
            id="f-garantidor"
            ariaLabel="O cliente é garantidor?"
            value={n.garantidor}
            allowClear
            onChange={(v) => editar((d) => void (d.garantidor = v))}
            options={[
              { value: true, label: 'Sim' },
              { value: false, label: 'Não' },
            ]}
          />
        </Field>
        <Field
          label="Data da base de garantias"
          htmlFor="f-dataGarantias"
          hint={
            n.dataGarantias === DATA_BASE_GARANTIAS ? (
              <span className="text-fg-3">Data padrão da base de garantias.</span>
            ) : n.dataGarantias ? (
              <button type="button" className="text-primary-ink hover:underline" onClick={() => editar((d) => void (d.dataGarantias = DATA_BASE_GARANTIAS))}>
                Voltar para a data padrão ({fmtDate(DATA_BASE_GARANTIAS)})
              </button>
            ) : undefined
          }
        >
          <DateInput id="f-dataGarantias" value={n.dataGarantias} onChange={(v) => editar((d) => void (d.dataGarantias = v))} />
        </Field>
      </div>
    </div>
  )
}

/* ---------- Anotações ---------- */
export function Anotacoes({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  return (
    <Field label="Observações" htmlFor="f-anotacoes">
      <TextArea
        id="f-anotacoes"
        value={n.anotacoes}
        placeholder="Qualquer observação que precise constar no texto final…"
        onChange={(e) => editar((d) => void (d.anotacoes = e.target.value))}
      />
    </Field>
  )
}
