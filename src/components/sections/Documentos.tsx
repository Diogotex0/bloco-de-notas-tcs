import { AnimatePresence, motion } from 'motion/react'
import { Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { DocApoio, DocRecebido, Note } from '../../lib/types'
import { DOC_TIPOS, ORIGENS, PP, novoApoio, novoRecebido } from '../../lib/defaults'
import { removerComDesfazer } from '../../lib/actions'
import { useNotes } from '../../store/notes'
import { porId } from '../../lib/janela'
import { Button, Callout, Checkbox, Field, IconButton, Reveal, Select, TextInput, cx, itemCard, itemMotion } from '../ui'
import { DateInput } from '../DateInput'
import { EmptyMini, SubHead } from '../Section'

type Lista = 'docsRecebidos' | 'docsApoio'
const TIPOS: [string, string][] = [...DOC_TIPOS.map((t): [string, string] => [t, t]), ['Outro', 'Outro (especificar)']]
const ORIGENS_OPT: [string, string][] = [...ORIGENS.map((o): [string, string] => [o, o]), ['Outro', 'Outro (especificar)']]

function useSetDoc() {
  const editar = useNotes((s) => s.editar)
  return <K extends Lista>(lista: K, id: string, fn: (d: Note[K][number]) => void) =>
    editar((n) => {
      const d = (n[lista] as Note[K][number][]).find((x) => x.id === id)
      if (d) fn(d)
    })
}

/** Caixa obrigatória da procuração particular. Enquanto não validada, a cópia fica bloqueada. */
function ValidacaoPP({ d, lista }: { d: DocRecebido; lista: Lista }) {
  const setDoc = useSetDoc()
  const ok = d.validado
  return (
    <motion.div
      layout
      className={cx(
        'mt-3 grid gap-3 rounded-xl border p-3.5 transition-colors duration-300',
        ok ? 'border-ok-line bg-ok-soft' : 'border-bad-line bg-bad-soft',
      )}
      data-flash
    >
      <div className="flex items-start gap-3">
        <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg transition-colors', ok ? 'bg-ok/15 text-ok' : 'bg-bad/12 text-bad')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={String(ok)} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.18 }}>
              {ok ? <ShieldCheck className="size-[17px]" /> : <Lock className="size-[17px]" />}
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-fg">
            {ok ? 'Procuração particular validada' : 'Validação da procuração particular obrigatória'}
          </p>
          <p className="text-[12.5px] text-fg-2">
            {ok
              ? 'Validação registrada e evidência anexada.'
              : 'Sem isso, o texto não pode ser copiado.'}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Meio de validação" htmlFor={`${d.id}-valMeio`}>
          <Select
            id={`${d.id}-valMeio`}
            value={d.valMeio}
            onChange={(e) => setDoc(lista, d.id, (x) => void (x.valMeio = e.target.value === 'Outro' ? 'Outro' : 'ITI'))}
            options={[
              ['ITI', 'ITI (validar.iti.gov.br)'],
              ['Outro', 'Outro meio'],
            ]}
          />
        </Field>
        {d.valMeio === 'Outro' && (
          <Field label="Qual meio?" htmlFor={`${d.id}-valMeioOutro`}>
            <TextInput
              id={`${d.id}-valMeioOutro`}
              value={d.valMeioOutro}
              placeholder="Ex.: confirmação no cartório"
              onChange={(e) => setDoc(lista, d.id, (x) => void (x.valMeioOutro = e.target.value))}
            />
          </Field>
        )}
      </div>
      <Checkbox
        id={`${d.id}-validado`}
        checked={d.validado}
        onChange={(v) => setDoc(lista, d.id, (x) => void (x.validado = v))}
        label={<span className="font-medium">Validação realizada e evidência anexada</span>}
      />
    </motion.div>
  )
}

function TipoCampos({ d, lista }: { d: DocRecebido; lista: Lista }) {
  const setDoc = useSetDoc()
  return (
    <>
      <Field label="Tipo do documento" htmlFor={`${d.id}-tipo`}>
        <Select
          id={`${d.id}-tipo`}
          value={d.tipo}
          placeholder="Selecione o tipo…"
          options={TIPOS}
          onChange={(e) => setDoc(lista, d.id, (x) => void (x.tipo = e.target.value))}
        />
      </Field>
      {d.tipo === 'Outro' && (
        <Field label="Qual documento?" htmlFor={`${d.id}-tipoOutro`}>
          <TextInput
            id={`${d.id}-tipoOutro`}
            value={d.tipoOutro}
            placeholder="Descreva o documento"
            onChange={(e) => setDoc(lista, d.id, (x) => void (x.tipoOutro = e.target.value))}
          />
        </Field>
      )}
    </>
  )
}

function Remover({ lista, d, i }: { lista: Lista; d: DocRecebido; i: number }) {
  return (
    <IconButton
      label="Remover documento"
      tone="danger"
      onClick={() =>
        removerComDesfazer(`Documento ${d.tipo || i + 1} removido`, (n) => {
          if (lista === 'docsRecebidos') n.docsRecebidos = n.docsRecebidos.filter((x) => x.id !== d.id)
          else n.docsApoio = n.docsApoio.filter((x) => x.id !== d.id)
        })
      }
    >
      <Trash2 />
    </IconButton>
  )
}

function Recebido({ d, i }: { d: DocRecebido; i: number }) {
  return (
    <motion.div {...itemMotion} className={itemCard}>
      <div className="flex items-start gap-3">
        <div className={cx('grid flex-1 gap-3', d.tipo === 'Outro' && 'sm:grid-cols-2')}>
          <TipoCampos d={d} lista="docsRecebidos" />
        </div>
        <div className="pt-[22px]">
          <Remover lista="docsRecebidos" d={d} i={i} />
        </div>
      </div>
      {d.tipo === PP && <ValidacaoPP d={d} lista="docsRecebidos" />}
    </motion.div>
  )
}

function Apoio({ d, i }: { d: DocApoio; i: number }) {
  const setDoc = useSetDoc()
  return (
    <motion.div {...itemMotion} className={itemCard}>
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-3">
          <div className={cx('grid gap-3', d.tipo === 'Outro' && 'sm:grid-cols-2')}>
            <TipoCampos d={d} lista="docsApoio" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field label="De onde foi retirado" htmlFor={`${d.id}-origem`}>
              <Select
                id={`${d.id}-origem`}
                value={d.origem}
                placeholder="Selecione a origem…"
                options={ORIGENS_OPT}
                onChange={(e) =>
                  setDoc('docsApoio', d.id, (x) => {
                    x.origem = e.target.value
                    // Junta Comercial precisa ser anexada na proposta (exceções são raras, dá para desmarcar).
                    if (e.target.value === 'Junta Comercial') x.anexado = true
                  })
                }
              />
            </Field>
            <Field label="Data do documento" htmlFor={`${d.id}-data`}>
              <DateInput id={`${d.id}-data`} value={d.data} onChange={(v) => setDoc('docsApoio', d.id, (x) => void (x.data = v))} />
            </Field>
            <div className="flex items-end sm:pt-[22px]">
              <Checkbox
                id={`${d.id}-anexado`}
                checked={d.anexado}
                onChange={(v) => setDoc('docsApoio', d.id, (x) => void (x.anexado = v))}
                label="Anexado na proposta"
              />
            </div>
          </div>
          {d.origem === 'Outro' && (
            <Field label="Qual origem?" htmlFor={`${d.id}-origemOutro`}>
              <TextInput
                id={`${d.id}-origemOutro`}
                value={d.origemOutro}
                placeholder="Ex.: enviado pelo cliente por e-mail"
                onChange={(e) => setDoc('docsApoio', d.id, (x) => void (x.origemOutro = e.target.value))}
              />
            </Field>
          )}
          <Reveal show={d.origem === 'Junta Comercial' && !d.anexado}>
            <Callout tone="warn">Documento da Junta Comercial: anexe na proposta e marque a opção acima.</Callout>
          </Reveal>
        </div>
        <div className="pt-[22px]">
          <Remover lista="docsApoio" d={d} i={i} />
        </div>
      </div>
      {d.tipo === PP && <ValidacaoPP d={d} lista="docsApoio" />}
    </motion.div>
  )
}

export function Documentos({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const add = (lista: Lista) => {
    const item = lista === 'docsRecebidos' ? novoRecebido() : novoApoio()
    editar((d) => {
      if (lista === 'docsRecebidos') d.docsRecebidos.push(item)
      else d.docsApoio.push(item as DocApoio)
    })
    window.setTimeout(() => porId(`${item.id}-tipo`)?.focus(), 60)
  }

  return (
    <div className="grid gap-6">
      <div>
        <SubHead title="Recebidos na proposta" />
        <div className="relative grid gap-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {n.docsRecebidos.map((d, i) => (
              <Recebido key={d.id} d={d} i={i} />
            ))}
          </AnimatePresence>
          {!n.docsRecebidos.length && <EmptyMini>Nenhum ainda.</EmptyMini>}
        </div>
        <Button id="add-recebido" variant="soft" className="mt-3" onClick={() => add('docsRecebidos')}>
          <Plus /> Documento recebido
        </Button>
      </div>

      <div className="h-px bg-line" />

      <div>
<SubHead title="Documentos de apoio" desc="Os que você buscou. Informe a data e de onde tirou." />
        <div className="relative grid gap-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {n.docsApoio.map((d, i) => (
              <Apoio key={d.id} d={d} i={i} />
            ))}
          </AnimatePresence>
          {!n.docsApoio.length && <EmptyMini>Nenhum ainda.</EmptyMini>}
        </div>
        <Button variant="soft" className="mt-3" onClick={() => add('docsApoio')}>
          <Plus /> Documento de apoio
        </Button>
      </div>
    </div>
  )
}
