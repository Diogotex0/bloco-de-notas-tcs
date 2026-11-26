import { useMemo, useRef, useState } from 'react'
import type { Note } from '../lib/types'
import { normalizar } from '../lib/planilha'
import { useNotes } from '../store/notes'
import { abrirGerenciarPlanilha, useReferencia } from '../store/referencia'
import { Field, TextArea, TextInput, cx } from './ui'

/** Um código isolado (A02, P11) logo antes do cursor, ainda não escrito por extenso. */
const RE_CODIGO_ANTES = /(^|[^\w])([AaPp]\d{2})$/

/** Campo de anotações que escreve os códigos de autorização da planilha por extenso. */
export function CampoAnotacoes({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const ref = useReferencia((s) => s.ref)
  const codigos = ref?.codigos ?? {}
  const temCodigos = Object.keys(codigos).length > 0
  const area = useRef<HTMLTextAreaElement>(null)
  const [verLista, setVerLista] = useState(false)
  const [filtro, setFiltro] = useState('')

  /** Troca o código antes do cursor pelo texto completo. Vira um passo próprio no Ctrl+Z. */
  const expandir = (el: HTMLTextAreaElement, valor: string, cursor: number) => {
    const typed = valor[cursor - 1]
    if (!typed || !/[\s.,;:)]/.test(typed)) return
    const m = RE_CODIGO_ANTES.exec(valor.slice(0, cursor - 1))
    if (!m) return
    const codigo = m[2].toUpperCase()
    const desc = codigos[codigo]
    if (!desc) return
    const ini = cursor - 1 - m[2].length
    const trecho = `${codigo} - ${desc}`
    const novo = valor.slice(0, ini) + trecho + valor.slice(cursor - 1)
    editar((d) => void (d.anotacoes = novo), true)
    const pos = ini + trecho.length + 1
    requestAnimationFrame(() => {
      try {
        if (el.ownerDocument.activeElement === el) el.setSelectionRange(pos, pos)
      } catch {
        /* ignora */
      }
    })
  }

  const inserir = (codigo: string) => {
    const el = area.current
    const trecho = `${codigo} - ${codigos[codigo]}`
    const v = n.anotacoes
    const ini = el ? el.selectionStart : v.length
    const fim = el ? el.selectionEnd : v.length
    const antes = v.slice(0, ini)
    const sep = antes && !/\s$/.test(antes) ? ' ' : ''
    const novo = antes + sep + trecho + v.slice(fim)
    editar((d) => void (d.anotacoes = novo), true)
    const pos = ini + sep.length + trecho.length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  const lista = useMemo(() => {
    const t = normalizar(filtro)
    return Object.entries(codigos)
      .sort(([a], [b]) => (a[0] === b[0] ? +a.slice(1) - +b.slice(1) : a < b ? -1 : 1))
      .filter(([c, d]) => !t || normalizar(`${c} ${d}`).includes(t))
  }, [codigos, filtro])

  return (
    <Field
      label="Anotações"
      htmlFor="f-anotacoes"
      hint={
        temCodigos ? (
          <span className="text-fg-3">
            Digite um código da planilha (ex.: A02, P11) e espaço para escrever por extenso.{' '}
            <button type="button" className="font-medium text-primary-ink hover:underline" onClick={() => setVerLista((v) => !v)}>
              {verLista ? 'Esconder códigos' : 'Ver códigos'}
            </button>
          </span>
        ) : ref ? undefined : (
          <span className="text-fg-3">
            <button type="button" className="font-medium text-primary-ink hover:underline" onClick={abrirGerenciarPlanilha}>
              Carregue a planilha de referência
            </button>{' '}
            para escrever os códigos de autorização por extenso.
          </span>
        )
      }
    >
      <TextArea
        ref={area}
        id="f-anotacoes"
        value={n.anotacoes}
        placeholder="Formas de assinatura, quóruns, autorizações e qualquer observação que precise constar no texto final…"
        onChange={(e) => {
          const el = e.currentTarget
          const valor = el.value
          const cursor = el.selectionStart
          editar((d) => void (d.anotacoes = valor))
          const tipo = (e.nativeEvent as InputEvent).inputType
          if (temCodigos && (tipo === 'insertText' || tipo === 'insertLineBreak')) expandir(el, valor, cursor)
        }}
      />
      {verLista && temCodigos && (
        <div className="mt-1 rounded-md border border-line">
          <div className="border-b border-line p-2">
            <TextInput value={filtro} placeholder="Filtrar: conselho, unanimidade, 2/3…" onChange={(e) => setFiltro(e.target.value)} className="h-8 text-[13px]" />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1">
            {lista.map(([c, d]) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => inserir(c)}
                  title="Inserir nas anotações"
                  className={cx('grid w-full grid-cols-[38px_minmax(0,1fr)] gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] leading-snug text-fg-2 hover:bg-surface-2 hover:text-fg')}
                >
                  <span className="font-semibold text-fg tabular-nums">{c}</span>
                  <span>{d}</span>
                </button>
              </li>
            ))}
            {!lista.length && <li className="px-2 py-3 text-center text-[12.5px] text-fg-3">Nenhum código com “{filtro}”.</li>}
          </ul>
        </div>
      )}
    </Field>
  )
}
