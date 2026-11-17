import type { DocApoio, DocRecebido, Grupo, Note, Regra, Tri } from './types'
import { PP } from './defaults'
import { cnpjFormat } from './cnpj'
import { fmtDate } from './dates'
import { moneyFull } from './money'
import { docLabel, vencimento } from './analyze'

const ppTexto = (d: DocRecebido) => {
  if (d.tipo !== PP) return ''
  if (!d.validado) return ' (validação pendente)'
  const meio = d.valMeio === 'Outro' ? d.valMeioOutro.trim() || 'outro meio' : 'ITI'
  return ` (validação realizada via ${meio}, evidência anexada)`
}

export function mandatoTexto(g: Grupo) {
  const ini = fmtDate(g.inicio)
  const fim = fmtDate(g.duracao)
  if (g.indeterminado) return ini ? `de ${ini}, prazo indeterminado` : 'prazo indeterminado'
  if (ini && fim) return `de ${ini} a ${fim}`
  if (fim) return `até ${fim}`
  if (ini) return `a partir de ${ini}`
  return '—'
}

export const origemLabel = (d: DocApoio) => (d.origem === 'Outro' ? d.origemOutro.trim() || 'Outro' : d.origem)

export function regraTexto(n: Note, r: Regra) {
  const nomes = r.grupos
    .map((id) => n.grupos.find((g) => g.id === id))
    .filter((g) => !!g)
    .map((g) => g.nome.trim() || 'Grupo sem nome')
  const quem = nomes.length ? nomes.join(r.modo === 'conjunto' ? ' + ' : ' ou ') : '(selecione os grupos)'
  const modo = r.modo === 'conjunto' ? (nomes.length === 1 ? 'em conjunto entre si' : 'em conjunto') : 'isoladamente'
  const lim = r.semLimite ? 'sem limite de valor' : r.limite ? `até ${moneyFull(r.limite)}` : 'limite não informado'
  let s = `${quem} · ${modo} · ${lim}`
  if (r.requerAut) s += ` · requer autorização${r.autorizacao.trim() ? `: ${r.autorizacao.trim()}` : ''}`
  return s
}

export function fraseGarantidor(n: Note) {
  if (n.garantidor === null) return ''
  return `Cliente ${n.garantidor ? 'é' : 'não é'} garantidor de acordo com a base de garantias datada de ${
    fmtDate(n.dataGarantias) || '__/__/____'
  }.`
}

/* ---------- Blocos do texto (usados no texto completo e no "copiar por partes") ---------- */

export function blocoGrupos(n: Note): string[] {
  if (!n.grupos.length) return []
  return ['Grupos cadastrados:', ...n.grupos.map((g) => `- ${g.nome.trim() || '(sem nome)'} · Mandato: ${mandatoTexto(g)}`)]
}

export function blocoDocumentos(n: Note): string[] {
  const L: string[] = []
  const lista = (um: string, varios: string, itens: string[]) => {
    if (itens.length === 1) L.push(`${um}: ${itens[0]}`)
    else if (itens.length > 1) L.push(`${varios}:`, ...itens.map((t) => `- ${t}`))
  }
  const rec = n.docsRecebidos.map((d) => (d.tipo ? docLabel(d) : '(tipo não informado)') + ppTexto(d))
  const apo = n.docsApoio.map((d) => {
    const p = [d.tipo ? docLabel(d) : '(tipo não informado)']
    if (fmtDate(d.data)) p.push(`Data: ${fmtDate(d.data)}`)
    if (d.origem) p.push(`Origem: ${origemLabel(d)}`)
    let s = p.join(' · ')
    if (d.anexado) s += ' (anexado na proposta)'
    return s + ppTexto(d)
  })
  lista('Documento recebido', 'Documentos recebidos', rec)
  lista('Documento de apoio', 'Documentos de apoio', apo)
  return L
}

export function blocoFiliais(n: Note): string[] {
  if (n.temFiliais === null) return []
  if (n.temFiliais === false) return ['Filiais: Não']
  const L = ['Filiais: Sim']
  const blocos: [string, Tri][] = [
    ['Coube réplica', true],
    ['Não coube réplica', false],
    ['A definir', null],
  ]
  blocos.forEach(([titulo, val]) => {
    const fs = n.filiais.filter((f) => f.replica === val)
    if (fs.length) L.push(`${titulo}:`, ...fs.map((f) => `- ${cnpjFormat(f.cnpj)}`))
  })
  return L
}

export function blocoAssinaturas(n: Note): string[] {
  const L: string[] = []
  if (n.regras.length) L.push('Formas de assinatura:', ...n.regras.map((r) => `- ${regraTexto(n, r)}`))
  if (n.quoruns.trim()) {
    if (L.length) L.push('')
    L.push('Quóruns e autorizações:', n.quoruns.trim())
  }
  return L
}

/** Gera o texto no modelo do analista. Extras (Receita, outorga) só aparecem quando preenchidos. */
export function gerarTexto(n: Note) {
  const L: string[] = []
  const gap = () => {
    if (L.length && L[L.length - 1] !== '') L.push('')
  }

  L.push(`CNPJ: ${n.cnpj || '—'}`)
  L.push(`Proposta: ${n.proposta.trim() || '—'}`)
  L.push(`Razão social: ${n.razaoSocial.trim() || '—'}`)
  if (n.receita) L.push(`Receita Federal: ${n.receita === 'ativo' ? 'Ativo' : 'Inativo'}`)

  const grupos = blocoGrupos(n)
  if (grupos.length) {
    gap()
    L.push(...grupos)
  }

  const docs = blocoDocumentos(n)
  if (docs.length) {
    gap()
    L.push(...docs)
  }

  const o = n.outorga
  if (o.indeterminada) L.push('Outorga: prazo indeterminado')
  else if (o.emissao) {
    const v = vencimento(o)
    const q = parseInt(o.qtd, 10)
    const un = o.unidade === 'meses' ? (q === 1 ? 'mês' : 'meses') : q === 1 ? 'ano' : 'anos'
    L.push(
      `Outorga: emitida em ${fmtDate(o.emissao)}${
        v && 'date' in v ? ` · validade de ${q} ${un} · vence em ${fmtDate(v.date)}` : ''
      }`,
    )
  }

  gap()
  const g = fraseGarantidor(n)
  if (g) L.push(g)
  L.push(`Razão social: ${n.razaoAlterada ? 'Alterada' : 'Não alterada'}`)
  L.push(...blocoFiliais(n))

  const ass = blocoAssinaturas(n)
  if (ass.length) {
    gap()
    L.push(...ass)
  }
  if (n.anotacoes.trim()) {
    gap()
    L.push('Anotações:', n.anotacoes.trim())
  }

  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
