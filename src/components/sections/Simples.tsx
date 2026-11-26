import type { Note } from '../../lib/types'
import { fmtDate } from '../../lib/dates'
import { useNotes } from '../../store/notes'
import { DATA_BASE_GARANTIAS } from '../../lib/defaults'
import { Field, Segmented, TextArea } from '../ui'
import { DateInput } from '../DateInput'

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
