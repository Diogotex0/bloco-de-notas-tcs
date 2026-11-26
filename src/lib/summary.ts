import type { Note, SectionKey } from './types'
import { docLabel } from './analyze'
import { fmtDate } from './dates'

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

/** Uma linha curta mostrada na etapa fechada, para ver o que já foi preenchido sem abrir. */
export function resumoEtapa(n: Note, k: SectionKey): string {
  switch (k) {
    case 'proposta':
      return [n.cnpj, n.proposta.trim() && `Proposta ${n.proposta.trim()}`].filter(Boolean).join(' · ')
    case 'grupos':
      return n.grupos.map((g) => g.nome.trim() || 'Sem nome').join(', ')
    case 'docs': {
      const p = []
      if (n.docsRecebidos.length) p.push(n.docsRecebidos.map((d) => (d.tipo ? docLabel(d) : 'Sem tipo')).join(', '))
      if (n.docsApoio.length) p.push(pl(n.docsApoio.length, 'de apoio', 'de apoio'))
      return p.join(' · ')
    }
    case 'garantidor':
      if (n.garantidor === null) return ''
      return `${n.garantidor ? 'É garantidor' : 'Não é garantidor'}${n.dataGarantias ? ` · base de ${fmtDate(n.dataGarantias)}` : ''}`
    case 'filiais': {
      if (n.temFiliais === null) return ''
      if (!n.temFiliais) return 'Sem filiais'
      const sim = n.filiais.filter((f) => f.replica === true).length
      const nao = n.filiais.filter((f) => f.replica === false).length
      return `${pl(n.filiais.length, 'filial', 'filiais')} · ${sim} com réplica · ${nao} sem`
    }
    case 'assinaturas':
      return n.regras.length ? pl(n.regras.length, 'forma de assinatura', 'formas de assinatura') : n.quoruns.trim() ? 'Quóruns preenchidos' : ''
    case 'anotacoes': {
      const t = n.anotacoes.trim().replace(/\s+/g, ' ')
      return t.length > 70 ? t.slice(0, 70) + '…' : t
    }
  }
}
