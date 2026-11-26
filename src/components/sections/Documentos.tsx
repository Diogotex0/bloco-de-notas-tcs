import { AnimatePresence, motion } from 'motion/react'
import { Lock, MessageSquareText, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import type { DocApoio, DocRecebido, Note } from '../../lib/types'
import { DOC_TIPOS, ORIGENS, PLATAFORMAS, PP, PUB, UFS, novoApoio, novoRecebido } from '../../lib/defaults'
import { respostaDaPlataforma } from '../../lib/sugestoes'
import { removerComDesfazer } from '../../lib/actions'
import { useCurrent, useNotes } from '../../store/notes'
import { abrirGerenciarPlanilha, abrirRespostas, linksJunta, useReferencia } from '../../store/referencia'
import { LinkExterno } from '../LinkExterno'
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

/** Link da consulta na Junta Comercial do estado (vem da planilha de referência). */
function LinkJunta({ ufFixa }: { ufFixa?: string }) {
  const ref = useReferencia((s) => s.ref)
  const n = useCurrent()
  const editar = useNotes((s) => s.editar)
  const uf = ufFixa ?? n?.uf ?? ''
  if (!ref)
    return (
      <p className="text-[12.5px] text-fg-3">
        <button type="button" onClick={abrirGerenciarPlanilha} className="font-medium text-primary-ink hover:underline">
          Carregue a planilha de referência
        </button>{' '}
        para ver o link da Junta Comercial.
      </p>
    )
  const junta = linksJunta(ref, uf)
  if (ufFixa && !junta) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
      {!ufFixa && (
        <label className="inline-flex items-center gap-1.5 text-fg-3">
          Junta de
          <select
            aria-label="Estado da Junta Comercial"
            value={uf}
            onChange={(e) => editar((d) => void (d.uf = e.target.value))}
            className="h-7 cursor-pointer rounded-sm border border-line-strong bg-surface px-1.5 text-[12.5px] text-fg outline-none focus:border-primary"
          >
            <option value="">UF</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      )}
      {junta ? (
        junta.urls.map((u, i) => (
          <LinkExterno key={u} href={u}>
            {i === 0 ? `Consultar na Junta Comercial (${uf})` : `Outra consulta (${i + 1})`}
          </LinkExterno>
        ))
      ) : uf ? (
        <span className="text-fg-3">A planilha não tem link da Junta de {uf}.</span>
      ) : (
        <span className="text-fg-3">Escolha o estado para abrir a consulta.</span>
      )}
    </div>
  )
}

/** Validador do ITI: o da planilha, se houver; senão o endereço oficial. */
function LinkITI() {
  const ref = useReferencia((s) => s.ref)
  const l = ref?.links.find((x) => /ITI/.test(x.nome.toUpperCase()) && !/ANTIGO/i.test(x.nome))
  return <LinkExterno href={l?.urls[0] ?? 'https://validar.iti.gov.br/'}>Abrir o validador do ITI</LinkExterno>
}

/** Caixa obrigatória da procuração particular. Enquanto não validada, a cópia fica bloqueada. */
function ValidacaoPP({ d, lista }: { d: DocRecebido; lista: Lista }) {
  const setDoc = useSetDoc()
  const ref = useReferencia((s) => s.ref)
  const ok = d.validado
  const falhou = !ok && d.semValidacao
  const resposta = falhou ? respostaDaPlataforma(ref, d) : undefined
  return (
    <motion.div
      layout
      className={cx('mt-3 grid gap-3 border-l-2 py-1 pl-3.5', ok ? 'border-ok' : 'border-bad')}
      data-flash
    >
      <div className="flex items-start gap-2">
        {ok ? (
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
        ) : falhou ? (
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-bad" />
        ) : (
          <Lock className="mt-0.5 size-4 shrink-0 text-bad" />
        )}
        <div className="min-w-0">
          <p className={cx('text-[13.5px] font-semibold', ok ? 'text-fg' : 'text-bad')}>
            {ok ? 'Procuração particular validada' : falhou ? 'Não foi possível validar a procuração' : 'Validação da procuração particular obrigatória'}
          </p>
          <p className="text-[12.5px] text-fg-2">
            {ok ? 'Validação registrada e evidência anexada.' : falhou ? 'Pendencie o cliente. O texto continua bloqueado.' : 'Sem isso, o texto não pode ser copiado.'}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Como foi assinada" htmlFor={`${d.id}-plataforma`} optional>
          <Select
            id={`${d.id}-plataforma`}
            value={d.plataforma}
            onChange={(e) => setDoc(lista, d.id, (x) => void (x.plataforma = e.target.value))}
            options={[['', 'Não informado'], ...PLATAFORMAS.map((p): [string, string] => [p.nome, p.nome])]}
          />
        </Field>
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
      {d.valMeio === 'ITI' && !ok && (
        <div>
          <LinkITI />
        </div>
      )}
      <div className="flex flex-wrap gap-x-6">
        <Checkbox
          id={`${d.id}-validado`}
          checked={d.validado}
          onChange={(v) =>
            setDoc(lista, d.id, (x) => {
              x.validado = v
              if (v) x.semValidacao = false
            })
          }
          label={<span className="font-medium">Validação realizada e evidência anexada</span>}
        />
        <Checkbox
          id={`${d.id}-semValidacao`}
          checked={falhou}
          onChange={(v) =>
            setDoc(lista, d.id, (x) => {
              x.semValidacao = v
              if (v) x.validado = false
            })
          }
          label="Não foi possível validar"
        />
      </div>
      {falhou && (
        <div className="flex flex-wrap items-center gap-2">
          {resposta ? (
            <Button size="sm" variant="outline" onClick={() => abrirRespostas(resposta)}>
              <MessageSquareText /> Usar a pendência pronta: {resposta}
            </Button>
          ) : !ref ? (
            <p className="text-[12.5px] text-fg-3">
              <button type="button" onClick={abrirGerenciarPlanilha} className="font-medium text-primary-ink hover:underline">
                Carregue a planilha de referência
              </button>{' '}
              para ter a pendência pronta desta plataforma.
            </p>
          ) : d.plataforma === 'Assinatura manuscrita' ? (
            <p className="text-[12.5px] text-fg-3">A planilha não tem texto pronto para assinatura manuscrita.</p>
          ) : (
            <p className="text-[12.5px] text-fg-3">Escolha como a procuração foi assinada para ver a pendência certa.</p>
          )}
        </div>
      )}
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

/** Livro e folha do cartório, só para procuração pública. */
function LivroFolha({ d, lista }: { d: DocRecebido; lista: Lista }) {
  const setDoc = useSetDoc()
  return (
    <>
      <Field label="Livro" htmlFor={`${d.id}-livro`}>
        <TextInput
          id={`${d.id}-livro`}
          value={d.livro}
          placeholder="Ex.: 1234"
          onChange={(e) => setDoc(lista, d.id, (x) => void (x.livro = e.target.value))}
        />
      </Field>
      <Field label="Folha" htmlFor={`${d.id}-folha`}>
        <TextInput
          id={`${d.id}-folha`}
          value={d.folha}
          placeholder="Ex.: 056"
          onChange={(e) => setDoc(lista, d.id, (x) => void (x.folha = e.target.value))}
        />
      </Field>
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
  const setDoc = useSetDoc()
  return (
    <motion.div {...itemMotion} className={itemCard}>
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-3">
          <div className={cx('grid gap-3', d.tipo === 'Outro' && 'sm:grid-cols-2')}>
            <TipoCampos d={d} lista="docsRecebidos" />
          </div>
          <div className={cx('grid gap-3', d.tipo === PUB ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {d.tipo === PUB && <LivroFolha d={d} lista="docsRecebidos" />}
            <Field label="Data do documento" htmlFor={`${d.id}-data`}>
              <DateInput id={`${d.id}-data`} value={d.data} onChange={(v) => setDoc('docsRecebidos', d.id, (x) => void (x.data = v))} />
            </Field>
          </div>
          <div>
            <Checkbox
              id={`${d.id}-jucesp`}
              checked={d.jucesp}
              onChange={(v) => setDoc('docsRecebidos', d.id, (x) => void (x.jucesp = v))}
              label="Retirado da JUCESP"
            />
            {d.jucesp && (
              <div className="grid gap-1">
                <p className="text-[12.5px] text-fg-3">Vai no texto como “Retirado da JUCESP, em anexo”. Lembre de anexar o documento na proposta.</p>
                <LinkJunta ufFixa="SP" />
              </div>
            )}
          </div>
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
          {d.tipo === PUB && (
            <div className="grid gap-3 sm:grid-cols-2">
              <LivroFolha d={d} lista="docsApoio" />
            </div>
          )}
          {d.origem === 'Proposta anterior' && (
            <Field label="Nº da proposta anterior" htmlFor={`${d.id}-propostaAnterior`}>
              <TextInput
                id={`${d.id}-propostaAnterior`}
                value={d.propostaAnterior}
                placeholder="Ex.: 2025-003210"
                onChange={(e) => setDoc('docsApoio', d.id, (x) => void (x.propostaAnterior = e.target.value))}
              />
            </Field>
          )}
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
      <div className="rounded-md border border-line bg-surface-2 px-3 py-2">
        <LinkJunta />
      </div>

      <div>
        <SubHead title="Documento utilizado" desc="O que veio na proposta. Informe a data do documento." />
        <div className="relative grid gap-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {n.docsRecebidos.map((d, i) => (
              <Recebido key={d.id} d={d} i={i} />
            ))}
          </AnimatePresence>
          {!n.docsRecebidos.length && <EmptyMini>Nenhum ainda.</EmptyMini>}
        </div>
        <Button id="add-recebido" variant="soft" className="mt-3" onClick={() => add('docsRecebidos')}>
          <Plus /> Documento utilizado
        </Button>
      </div>

      <div className="h-px bg-line" />

      <div>
<SubHead title="Documentos de apoio" desc="Os que você buscou. Informe a data e de onde tirou (inclusive de uma proposta anterior)." />
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
