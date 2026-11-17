import { create } from 'zustand'
import type { Note, SectionKey } from './types'
import { cnpjClean, cnpjFormat, cnpjValido } from './cnpj'
import { fmtDate, parseISO } from './dates'
import { novaFilial } from './defaults'
import { docLabel } from './analyze'
import { lerData } from '../components/DateInput'
import { irPara } from './actions'
import { useNotes } from '../store/notes'
import { toast } from '../store/toast'

/* ---------- Reconhecer o que foi colado ---------- */

const RE_CNPJ = /(?<![0-9A-Z])[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2}(?![0-9A-Z])/g

/** Acha CNPJs num texto qualquer. Só aceita sequências que parecem mesmo CNPJ (válidas ou 14 dígitos). */
export function extrairCnpjs(texto: string): string[] {
  const achados = (texto.toUpperCase().match(RE_CNPJ) ?? []).map(cnpjClean)
  const ok = achados.filter((c) => c.length === 14 && (cnpjValido(c) || /^\d{14}$/.test(c)))
  return [...new Set(ok)]
}

export type Colado =
  | { tipo: 'cnpjs'; lista: string[] }
  | { tipo: 'data'; iso: string }
  | { tipo: 'proposta'; valor: string }
  | { tipo: 'razao'; valor: string }
  | { tipo: 'desconhecido'; texto: string }

export function reconhecer(bruto: string): Colado {
  const texto = bruto.trim()
  const cnpjs = extrairCnpjs(texto)
  if (cnpjs.length) return { tipo: 'cnpjs', lista: cnpjs }

  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(texto)) {
    const iso = lerData(texto)
    if (iso) return { tipo: 'data', iso }
  }
  // Número de proposta: um "código" curto, sem espaços, com pelo menos 3 dígitos.
  if (/^[A-Za-z0-9][A-Za-z0-9\-/.]{2,29}$/.test(texto) && (texto.match(/\d/g) ?? []).length >= 3) return { tipo: 'proposta', valor: texto }
  // Razão social: tem cara de nome de empresa.
  if (texto.length <= 150 && !texto.includes('\n') && /\b(LTDA|S\.?\s?A\.?|EIRELI|ME|EPP|S\/A|COMPANHIA|CIA)\b/i.test(texto))
    return { tipo: 'razao', valor: texto.replace(/\s+/g, ' ') }
  return { tipo: 'desconhecido', texto }
}

/* ---------- Escolher o campo de uma data colada ---------- */

export interface DestinoData {
  rotulo: string
  sec: SectionKey
  alvo: string
  aplicar: (n: Note, iso: string) => void
}

export const useColarData = create<{ iso: string | null }>(() => ({ iso: null }))

export function destinosData(n: Note): DestinoData[] {
  const out: DestinoData[] = [
    { rotulo: 'Base de garantias', sec: 'garantidor', alvo: 'f-dataGarantias', aplicar: (d, iso) => void (d.dataGarantias = iso) },
  ]
  n.grupos.forEach((g, i) => {
    const nome = g.nome.trim() || `Grupo ${i + 1}`
    out.push({
      rotulo: `Início do mandato · ${nome}`,
      sec: 'grupos',
      alvo: `${g.id}-inicio`,
      aplicar: (d, iso) => {
        const x = d.grupos.find((y) => y.id === g.id)
        if (x) x.inicio = iso
      },
    })
    if (!g.indeterminado)
      out.push({
        rotulo: `Fim do mandato · ${nome}`,
        sec: 'grupos',
        alvo: `${g.id}-duracao`,
        aplicar: (d, iso) => {
          const x = d.grupos.find((y) => y.id === g.id)
          if (x) x.duracao = iso
        },
      })
  })
  n.docsApoio.forEach((doc, i) =>
    out.push({
      rotulo: `Data do documento · ${doc.tipo ? docLabel(doc) : `Apoio ${i + 1}`}`,
      sec: 'docs',
      alvo: `${doc.id}-data`,
      aplicar: (d, iso) => {
        const x = d.docsApoio.find((y) => y.id === doc.id)
        if (x) x.data = iso
      },
    }),
  )
  if (!n.outorga.indeterminada)
    out.push({ rotulo: 'Emissão da outorga', sec: 'outorga', alvo: 'f-emissao', aplicar: (d, iso) => void (d.outorga.emissao = iso) })
  return out
}

/* ---------- Aplicar ---------- */

function comDesfazer(msg: string, fn: (n: Note) => void, ir?: { sec: SectionKey; target: string }) {
  const st = useNotes.getState()
  const antes = st.notes.find((x) => x.id === st.currentId)
  if (!antes) return
  const snap = structuredClone(antes)
  st.editar(fn)
  toast(msg, { type: 'success', duration: 6000, action: { label: 'Desfazer', run: () => useNotes.getState().restaurar(snap) } })
  if (ir) irPara(ir)
}

export function colarInteligente(bruto: string) {
  const c = reconhecer(bruto)
  const st = useNotes.getState()
  let n = st.notes.find((x) => x.id === st.currentId)
  // Sem anotação aberta (ou aberta na lixeira): começa uma nova.
  if (!n || n.excluidaEm) {
    if (c.tipo === 'desconhecido') {
      toast('Não reconheci o que foi colado. Abra uma anotação e cole num campo.', { type: 'info' })
      return
    }
    st.criar()
    const s2 = useNotes.getState()
    n = s2.notes.find((x) => x.id === s2.currentId)
    if (!n) return
  }

  if (c.tipo === 'cnpjs') {
    const principal = cnpjClean(n.cnpj)
    if (c.lista.length === 1 && !principal) {
      comDesfazer(`CNPJ ${cnpjFormat(c.lista[0])} colado`, (d) => void (d.cnpj = cnpjFormat(c.lista[0])), { sec: 'proposta', target: 'f-cnpj' })
      return
    }
    const existentes = new Set(n.filiais.map((f) => f.cnpj))
    const novas = c.lista.filter((x) => x !== principal && !existentes.has(x))
    if (!novas.length) {
      toast(c.lista.length === 1 && c.lista[0] === principal ? 'Esse já é o CNPJ desta anotação.' : 'Essas filiais já estão na lista.', { type: 'info' })
      return
    }
    comDesfazer(
      `${novas.length} ${novas.length === 1 ? 'filial adicionada' : 'filiais adicionadas'}`,
      (d) => {
        d.temFiliais = true
        d.filiais.push(...novas.map((x) => novaFilial(x)))
      },
      { sec: 'filiais', target: 'f-filiaisInput' },
    )
    return
  }

  if (c.tipo === 'proposta') {
    const antes = n.proposta.trim()
    comDesfazer(
      antes ? `Proposta trocada de ${antes} para ${c.valor}` : `Proposta ${c.valor} colada`,
      (d) => void (d.proposta = c.valor),
      { sec: 'proposta', target: 'f-proposta' },
    )
    return
  }

  if (c.tipo === 'razao') {
    comDesfazer('Razão social colada', (d) => void (d.razaoSocial = c.valor), { sec: 'proposta', target: 'f-razao' })
    return
  }

  if (c.tipo === 'data') {
    if (!parseISO(c.iso)) return
    useColarData.setState({ iso: c.iso })
    return
  }

  const texto = c.texto
  toast('Não reconheci o que foi colado.', {
    type: 'info',
    duration: 6000,
    action: {
      label: 'Pôr nas anotações',
      run: () =>
        comDesfazer(
          'Texto colado nas anotações',
          (d) => void (d.anotacoes = d.anotacoes.trim() ? `${d.anotacoes.trimEnd()}\n${texto}` : texto),
          { sec: 'anotacoes', target: 'f-anotacoes' },
        ),
    },
  })
}

export function aplicarData(destino: DestinoData, iso: string) {
  useColarData.setState({ iso: null })
  comDesfazer(`${fmtDate(iso)} colada em ${destino.rotulo.toLowerCase()}`, (d) => destino.aplicar(d, iso), {
    sec: destino.sec,
    target: destino.alvo,
  })
}

/** Ctrl+V fora dos campos: tenta entender o que foi colado. */
export function aoColar(e: ClipboardEvent) {
  const alvo = e.target as HTMLElement | null
  const editavel = alvo?.closest?.('input, textarea, select, [contenteditable=true]')
  if (editavel) return
  const texto = e.clipboardData?.getData('text/plain') ?? ''
  if (!texto.trim()) return
  e.preventDefault()
  colarInteligente(texto)
}
