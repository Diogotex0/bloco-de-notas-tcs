import type { Note } from './types'
import { PP } from './defaults'
import { docLabel } from './analyze'

export interface Anexo {
  chave: string
  texto: string
  detalhe?: string
}

/** O que precisa estar anexado na proposta, montado a partir do que foi preenchido. */
export function anexosNecessarios(n: Note): Anexo[] {
  const out: Anexo[] = []
  const docs = [...n.docsRecebidos, ...n.docsApoio]

  docs
    .filter((d) => d.tipo === PP)
    .forEach((d) => {
      const meio = d.valMeio === 'Outro' ? d.valMeioOutro.trim() || 'outro meio' : 'ITI'
      out.push({ chave: `pp-${d.id}`, texto: 'Validação da procuração particular', detalhe: `Print da validação no ${meio}` })
    })

  n.docsRecebidos
    .filter((d) => d.jucesp)
    .forEach((d) => out.push({ chave: `jucesp-${d.id}`, texto: `${d.tipo ? docLabel(d) : 'Documento'} retirado da JUCESP` }))

  n.docsApoio
    .filter((d) => d.origem === 'Junta Comercial')
    .forEach((d) => out.push({ chave: `junta-${d.id}`, texto: `${d.tipo ? docLabel(d) : 'Documento'} da Junta Comercial` }))

  if (docs.length) out.push({ chave: 'evidencias', texto: 'Evidências das consultas', detalhe: 'Prints usados na análise' })
  return out
}

export const anexosPendentes = (n: Note) => anexosNecessarios(n).filter((a) => !n.anexosOk.includes(a.chave))
