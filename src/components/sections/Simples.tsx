import type { Note } from '../../lib/types'
import { fmtDate } from '../../lib/dates'
import { useNotes } from '../../store/notes'
import { DATA_BASE_GARANTIAS, tipoSocietario } from '../../lib/defaults'
import { abrirGerenciarPlanilha, linkPorNome, quorumDoTipo, useReferencia } from '../../store/referencia'
import { normalizar } from '../../lib/planilha'
import { Field, Reveal, Segmented, TextArea } from '../ui'
import { DateInput } from '../DateInput'
import { CampoAnotacoes } from '../Codigos'
import { LinkExterno } from '../LinkExterno'

/** Quórum de garantias do tipo societário, tirado da planilha de referência. */
function QuorumTipo({ n }: { n: Note }) {
  const ref = useReferencia((s) => s.ref)
  const tipo = tipoSocietario(n)
  if (!tipo || tipo.nome === 'Outro') return null
  if (!ref)
    return (
      <p className="text-[12.5px] text-fg-3">
        Tipo {tipo.nome}.{' '}
        <button type="button" onClick={abrirGerenciarPlanilha} className="font-medium text-primary-ink hover:underline">
          Carregue a planilha de referência
        </button>{' '}
        para ver o quórum de garantias deste tipo.
      </p>
    )
  const q = quorumDoTipo(ref, tipo.quorum)
  const legal = ref.quorumLegal.filter((l) => (tipo.sa ? /ANONIMA|S\/A/ : tipo.nome === 'LTDA' ? /LTDA|LIMITADA/ : /^$/).test(normalizar(l.grupo)))
  const cvm = tipo.nome === 'Fundo de investimento' ? linkPorNome(ref, /CVM.*POSTERIOR/) ?? linkPorNome(ref, /CVM/) : undefined
  if (!q && !legal.length && !cvm) return null
  return (
    <div className="grid gap-2.5 rounded-md border border-line p-3.5">
      <p className="text-[12.5px] font-semibold text-fg-2">Quórum de garantias · {tipo.nome}</p>
      {q && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {q.omissao && (
            <div>
              <p className="text-[12px] font-medium text-fg-3">Documento omisso</p>
              <p className="text-[13px] leading-relaxed whitespace-pre-line text-fg">{q.omissao}</p>
            </div>
          )}
          {q.vedacao && (
            <div>
              <p className="text-[12px] font-medium text-fg-3">Com vedação</p>
              <p className="text-[13px] leading-relaxed whitespace-pre-line text-fg">{q.vedacao}</p>
            </div>
          )}
        </div>
      )}
      {legal.length > 0 && (
        <details className="group text-[13px]">
          <summary className="cursor-pointer text-[12.5px] font-medium text-primary-ink select-none hover:underline">Quórum legal e artigos</summary>
          <dl className="mt-2 grid gap-1.5">
            {legal.map((l) => (
              <div key={l.situacao} className="grid gap-x-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <dt className="text-fg-2">{l.situacao}</dt>
                <dd className="text-fg">
                  {l.quorum}
                  {l.artigo && <span className="text-fg-3"> · {l.artigo}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {cvm && (
        <div>
          <LinkExterno href={cvm.urls[0]}>Consultar a situação do fundo na CVM</LinkExterno>
        </div>
      )}
      <p className="text-[11.5px] text-fg-3">Da planilha de referência{ref.versao ? ` (${ref.versao})` : ''}. Se o documento definir o quórum, vale o do documento.</p>
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
      <QuorumTipo n={n} />
    </div>
  )
}

/* ---------- Anotações ---------- */
export function Anotacoes({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  return (
    <div className="grid gap-4">
      <CampoAnotacoes n={n} />
      <div className="grid gap-3 border-t border-line pt-4">
        <Field label="Tem alinhamento?">
          <Segmented
            id="f-temAlinhamento"
            ariaLabel="Tem alinhamento?"
            value={n.temAlinhamento}
            allowClear
            onChange={(v) => editar((d) => void (d.temAlinhamento = v))}
            options={[
              { value: true, label: 'Sim' },
              { value: false, label: 'Não' },
            ]}
          />
        </Field>
        <Reveal show={n.temAlinhamento === true}>
          <Field label="Texto do alinhamento" htmlFor="f-alinhamento">
            <TextArea
              id="f-alinhamento"
              value={n.alinhamento}
              placeholder="O que foi alinhado, com quem e quando. Entra no texto final."
              onChange={(e) => editar((d) => void (d.alinhamento = e.target.value))}
            />
          </Field>
        </Reveal>
      </div>
    </div>
  )
}
