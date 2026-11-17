import type { Note, SectionKey } from './types'
import { cnpjClean, cnpjFormat } from './cnpj'
import { docLabel } from './analyze'
import { mandatoTexto, regraTexto } from './generate'

export interface Mudanca {
  tipo: 'novo' | 'removido' | 'mudou'
  texto: string
  sec: SectionKey
}

const temDados = (n: Note) => n.grupos.length + n.docsRecebidos.length + n.docsApoio.length + n.filiais.length > 0
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')

/** A análise mais recente do mesmo CNPJ, criada antes desta (ou, se não houver, a mais recente). */
export function analiseAnterior(n: Note, notes: Note[]): Note | undefined {
  const c = cnpjClean(n.cnpj)
  if (c.length !== 14) return undefined
  const mesmas = notes.filter((x) => x.id !== n.id && !x.excluidaEm && cnpjClean(x.cnpj) === c && temDados(x))
  const antes = mesmas.filter((x) => x.createdAt < n.createdAt).sort((a, b) => b.createdAt - a.createdAt)
  return antes[0] ?? mesmas.sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

const pl = (q: number, s: string, p: string) => `${q} ${q === 1 ? s : p}`
const amostra = (xs: string[]) => (xs.length <= 3 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')} e mais ${xs.length - 3}`)

/** O que mudou entre a análise anterior e a atual. Só compara o que foi preenchido, sem interpretar. */
export function comparar(atual: Note, ant: Note): Mudanca[] {
  const out: Mudanca[] = []

  if (atual.razaoSocial.trim() && ant.razaoSocial.trim() && norm(atual.razaoSocial) !== norm(ant.razaoSocial))
    out.push({ tipo: 'mudou', sec: 'proposta', texto: `Razão social: antes “${ant.razaoSocial.trim()}”, agora “${atual.razaoSocial.trim()}”` })

  // Grupos (pelo nome)
  const gA = new Map(atual.grupos.filter((g) => g.nome.trim()).map((g) => [norm(g.nome), g]))
  const gB = new Map(ant.grupos.filter((g) => g.nome.trim()).map((g) => [norm(g.nome), g]))
  gA.forEach((g, k) => {
    const velho = gB.get(k)
    if (!velho) out.push({ tipo: 'novo', sec: 'grupos', texto: `Grupo ${g.nome.trim()} é novo` })
    else if (mandatoTexto(g) !== mandatoTexto(velho))
      out.push({ tipo: 'mudou', sec: 'grupos', texto: `Mandato de ${g.nome.trim()}: antes ${mandatoTexto(velho)}, agora ${mandatoTexto(g)}` })
  })
  gB.forEach((g, k) => {
    if (!gA.has(k)) out.push({ tipo: 'removido', sec: 'grupos', texto: `Grupo ${g.nome.trim()} não aparece mais` })
  })

  // Documentos (pelo tipo)
  const docs = (lista: Note['docsRecebidos']) => new Set(lista.filter((d) => d.tipo).map((d) => docLabel(d)))
  const comparaDocs = (a: Set<string>, b: Set<string>, nome: string) => {
    a.forEach((d) => !b.has(d) && out.push({ tipo: 'novo', sec: 'docs', texto: `${nome}: ${d} (novo)` }))
    b.forEach((d) => !a.has(d) && out.push({ tipo: 'removido', sec: 'docs', texto: `${nome}: ${d} (não está mais)` }))
  }
  comparaDocs(docs(atual.docsRecebidos), docs(ant.docsRecebidos), 'Documento recebido')
  comparaDocs(docs(atual.docsApoio), docs(ant.docsApoio), 'Documento de apoio')

  // Garantidor
  if (atual.garantidor !== null && ant.garantidor !== null && atual.garantidor !== ant.garantidor)
    out.push({ tipo: 'mudou', sec: 'garantidor', texto: `Garantidor: antes ${ant.garantidor ? 'era' : 'não era'}, agora ${atual.garantidor ? 'é' : 'não é'}` })

  // Filiais (pelo CNPJ)
  const fA = new Map(atual.filiais.map((f) => [f.cnpj, f]))
  const fB = new Map(ant.filiais.map((f) => [f.cnpj, f]))
  const novas = [...fA.keys()].filter((c) => !fB.has(c))
  const saiu = [...fB.keys()].filter((c) => !fA.has(c))
  const replica = [...fA.values()].filter((f) => fB.has(f.cnpj) && f.replica !== null && fB.get(f.cnpj)!.replica !== null && f.replica !== fB.get(f.cnpj)!.replica)
  if (novas.length) out.push({ tipo: 'novo', sec: 'filiais', texto: `${pl(novas.length, 'filial nova', 'filiais novas')}: ${amostra(novas.map(cnpjFormat))}` })
  if (saiu.length) out.push({ tipo: 'removido', sec: 'filiais', texto: `${pl(saiu.length, 'filial não aparece mais', 'filiais não aparecem mais')}: ${amostra(saiu.map(cnpjFormat))}` })
  if (replica.length) out.push({ tipo: 'mudou', sec: 'filiais', texto: `Réplica mudou em ${pl(replica.length, 'filial', 'filiais')}: ${amostra(replica.map((f) => cnpjFormat(f.cnpj)))}` })

  // Formas de assinatura (pelo texto gerado, que usa os nomes dos grupos)
  const rA = new Set(atual.regras.map((r) => regraTexto(atual, r)))
  const rB = new Set(ant.regras.map((r) => regraTexto(ant, r)))
  rA.forEach((r) => !rB.has(r) && out.push({ tipo: 'novo', sec: 'assinaturas', texto: `Forma de assinatura nova: ${r}` }))
  rB.forEach((r) => !rA.has(r) && out.push({ tipo: 'removido', sec: 'assinaturas', texto: `Forma de assinatura que não está mais: ${r}` }))
  if (atual.quoruns.trim() && ant.quoruns.trim() && norm(atual.quoruns) !== norm(ant.quoruns))
    out.push({ tipo: 'mudou', sec: 'assinaturas', texto: 'O texto de quóruns e autorizações mudou' })

  return out
}
