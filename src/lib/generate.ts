import type { DocApoio, DocRecebido, Grupo, Note, Regra, Tri } from './types'
import { PP } from './defaults'
import { cnpjFormat } from './cnpj'
import { fmtDate } from './dates'
import { moneyFull } from './money'
import { docLabel, vencimento } from './analyze'
import { type BlocoChave, type Modelo, rotulo } from './modelo'
import { useModelo } from '../store/modelo'

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

export const origemLabel = (d: DocApoio) => {
  if (d.origem === 'Outro') return d.origemOutro.trim() || 'Outro'
  if (d.origem === 'Proposta anterior') return d.propostaAnterior.trim() ? `Proposta anterior nº ${d.propostaAnterior.trim()}` : 'Proposta anterior'
  return d.origem
}

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

const atual = () => useModelo.getState().modelo

export function fraseGarantidor(n: Note, m: Modelo = atual()) {
  if (n.garantidor === null) return ''
  return rotulo(m, 'garantidor', 'frase')
    .replace(/\{é\/não é\}/g, n.garantidor ? 'é' : 'não é')
    .replace(/\{data\}/g, fmtDate(n.dataGarantias) || '__/__/____')
}

/** As linhas de um bloco do texto, com os rótulos do modelo. Bloco sem conteúdo devolve []. */
export function linhasBloco(n: Note, chave: BlocoChave, m: Modelo = atual()): string[] {
  const r = (id: string) => rotulo(m, chave, id)
  switch (chave) {
    case 'cnpj':
      return [`${r('rotulo')}: ${n.cnpj || '—'}`]
    case 'proposta':
      return [`${r('rotulo')}: ${n.proposta.trim() || '—'}`]
    case 'razao':
      return [`${r('rotulo')}: ${n.razaoSocial.trim() || '—'}`]
    case 'receita':
      return n.receita ? [`${r('rotulo')}: ${n.receita === 'ativo' ? 'Ativo' : 'Inativo'}`] : []
    case 'grupos':
      if (!n.grupos.length) return []
      return [`${r('titulo')}:`, ...n.grupos.map((g) => `- ${g.nome.trim() || '(sem nome)'} · ${r('mandato')}: ${mandatoTexto(g)}`)]
    case 'documentos': {
      const L: string[] = []
      const lista = (um: string, varios: string, itens: string[]) => {
        if (itens.length === 1) L.push(`${um}: ${itens[0]}`)
        else if (itens.length > 1) L.push(`${varios}:`, ...itens.map((t) => `- ${t}`))
      }
      const rec = n.docsRecebidos.map(
        (d) => (d.tipo ? docLabel(d) : '(tipo não informado)') + (fmtDate(d.data) ? ` · Data: ${fmtDate(d.data)}` : '') + ppTexto(d),
      )
      const apo = n.docsApoio.map((d) => {
        const p = [d.tipo ? docLabel(d) : '(tipo não informado)']
        if (fmtDate(d.data)) p.push(`Data: ${fmtDate(d.data)}`)
        if (d.origem) p.push(`Origem: ${origemLabel(d)}`)
        let s = p.join(' · ')
        if (d.anexado) s += ' (anexado na proposta)'
        return s + ppTexto(d)
      })
      lista(r('recebido'), r('recebidos'), rec)
      lista(r('apoio'), r('apoios'), apo)
      return L
    }
    case 'outorga': {
      const o = n.outorga
      if (o.indeterminada) return [`${r('rotulo')}: prazo indeterminado`]
      if (!o.emissao) return []
      const v = vencimento(o)
      const q = parseInt(o.qtd, 10)
      const un = o.unidade === 'meses' ? (q === 1 ? 'mês' : 'meses') : q === 1 ? 'ano' : 'anos'
      return [`${r('rotulo')}: emitida em ${fmtDate(o.emissao)}${v && 'date' in v ? ` · validade de ${q} ${un} · vence em ${fmtDate(v.date)}` : ''}`]
    }
    case 'garantidor': {
      const f = fraseGarantidor(n, m)
      return f ? [f] : []
    }
    case 'razaoAlterada':
      return [`${r('rotulo')}: ${n.razaoAlterada ? r('sim') : r('nao')}`]
    case 'filiais': {
      if (n.temFiliais === null) return []
      if (n.temFiliais === false) return [`${r('rotulo')}: Não`]
      const L = [`${r('rotulo')}: Sim`]
      const blocos: [string, Tri][] = [
        [r('coube'), true],
        [r('naoCoube'), false],
        [r('definir'), null],
      ]
      blocos.forEach(([titulo, val]) => {
        const fs = n.filiais.filter((f) => f.replica === val)
        if (fs.length) L.push(`${titulo}:`, ...fs.map((f) => `- ${cnpjFormat(f.cnpj)}`))
      })
      return L
    }
    case 'assinaturas':
      return n.regras.length ? [`${r('titulo')}:`, ...n.regras.map((x) => `- ${regraTexto(n, x)}`)] : []
    case 'quoruns':
      return n.quoruns.trim() ? [`${r('titulo')}:`, n.quoruns.trim()] : []
    case 'anotacoes':
      return n.anotacoes.trim() ? [`${r('titulo')}:`, n.anotacoes.trim()] : []
  }
}

/* ---------- Partes para o "copiar só…" ---------- */
export const blocoGrupos = (n: Note) => linhasBloco(n, 'grupos')
export const blocoDocumentos = (n: Note) => linhasBloco(n, 'documentos')
export const blocoFiliais = (n: Note) => linhasBloco(n, 'filiais')
export function blocoAssinaturas(n: Note): string[] {
  const a = linhasBloco(n, 'assinaturas')
  const q = linhasBloco(n, 'quoruns')
  return a.length && q.length ? [...a, '', ...q] : [...a, ...q]
}

/** Gera o texto final seguindo o modelo (ordem, rótulos e espaços). */
export function gerarTexto(n: Note, m: Modelo = atual()) {
  const L: string[] = []
  for (const b of m.blocos) {
    if (!b.ativo) continue
    const linhas = linhasBloco(n, b.chave, m)
    if (!linhas.length) continue
    if (b.espacoAntes && L.length && L[L.length - 1] !== '') L.push('')
    L.push(...linhas)
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
