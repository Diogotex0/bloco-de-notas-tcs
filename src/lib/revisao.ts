import { create } from 'zustand'
import type { Note, SectionKey } from './types'
import { SECTIONS } from './defaults'
import { docLabel, vencimento } from './analyze'
import { fmtDate } from './dates'
import { livroFolha, mandatoTexto, origemLabel, regraTexto } from './generate'
import { cnpjFormat } from './cnpj'

export const useRevisao = create<{ aberta: boolean }>(() => ({ aberta: false }))
export const abrirRevisao = () => useRevisao.setState({ aberta: true })

export interface Linha {
  rotulo: string
  valor: string // vazio = em branco
  opcional?: boolean
}

/** Tudo o que foi preenchido, etapa por etapa, para conferir antes de finalizar. */
export function linhasRevisao(n: Note): { key: SectionKey; titulo: string; linhas: Linha[] }[] {
  const L: Record<SectionKey, Linha[]> = {
    proposta: [
      { rotulo: 'CNPJ', valor: n.cnpj },
      { rotulo: 'Nº da proposta', valor: n.proposta.trim() },
      { rotulo: 'Razão social', valor: n.razaoSocial.trim() },
      { rotulo: 'Situação da razão social', valor: n.razaoAlterada ? 'Alterada' : 'Não alterada' },
      { rotulo: 'Receita Federal', valor: n.receita === 'ativo' ? 'Ativo' : n.receita === 'inativo' ? 'Inativo' : '', opcional: true },
    ],
    grupos: n.grupos.length
      ? n.grupos.map((g, i) => ({ rotulo: g.nome.trim() || `Grupo ${i + 1}`, valor: mandatoTexto(g) === '—' ? '' : mandatoTexto(g) }))
      : [{ rotulo: 'Grupos', valor: '' }],
    docs: [
      ...(n.docsRecebidos.length
        ? n.docsRecebidos.map((d) => ({
            rotulo: 'Utilizado',
            valor: d.tipo
              ? [docLabel(d) + (d.tipo === 'Procuração Particular' ? (d.validado ? ' (validada)' : ' (sem validação)') : ''), ...livroFolha(d), fmtDate(d.data)].filter(Boolean).join(' · ')
              : '',
          }))
        : [{ rotulo: 'Documento recebido', valor: '' }]),
      ...n.docsApoio.map((d) => ({
        rotulo: 'De apoio',
        valor: [d.tipo ? docLabel(d) : '', ...livroFolha(d), fmtDate(d.data), d.origem ? origemLabel(d) : ''].filter(Boolean).join(' · '),
      })),
    ],
    outorga: (() => {
      const v = vencimento(n.outorga)
      if (!v) return [{ rotulo: 'Outorga', valor: '', opcional: true }]
      if ('indeterminada' in v) return [{ rotulo: 'Outorga', valor: 'Prazo indeterminado' }]
      return [
        { rotulo: 'Emissão', valor: fmtDate(n.outorga.emissao) },
        { rotulo: 'Vencimento', valor: `${fmtDate(v.date)}${v.days < 0 ? ' (vencida)' : ''}` },
      ]
    })(),
    garantidor: [
      { rotulo: 'É garantidor?', valor: n.garantidor === null ? '' : n.garantidor ? 'Sim' : 'Não' },
      { rotulo: 'Base de garantias', valor: fmtDate(n.dataGarantias) },
    ],
    filiais: (() => {
      if (n.temFiliais === null) return [{ rotulo: 'Tem filiais?', valor: '' }]
      if (!n.temFiliais) return [{ rotulo: 'Tem filiais?', valor: 'Não' }]
      const sim = n.filiais.filter((f) => f.replica === true)
      const nao = n.filiais.filter((f) => f.replica === false)
      const nd = n.filiais.filter((f) => f.replica === null)
      const lista = (fs: typeof sim) => fs.map((f) => cnpjFormat(f.cnpj)).join(', ')
      return [
        { rotulo: 'Coube réplica', valor: lista(sim) || (n.filiais.length ? 'nenhuma' : '') },
        { rotulo: 'Não coube', valor: lista(nao) || (n.filiais.length ? 'nenhuma' : '') },
        ...(nd.length ? [{ rotulo: 'A definir', valor: lista(nd) }] : []),
      ]
    })(),
    assinaturas: [
      ...(n.regras.length ? n.regras.map((r, i) => ({ rotulo: `Forma ${i + 1}`, valor: regraTexto(n, r) })) : [{ rotulo: 'Formas de assinatura', valor: '', opcional: true }]),
      { rotulo: 'Quóruns e autorizações', valor: n.quoruns.trim(), opcional: true },
    ],
    anotacoes: [{ rotulo: 'Anotações', valor: n.anotacoes.trim(), opcional: true }],
  }
  return SECTIONS.map((s) => ({ key: s.key, titulo: s.title, linhas: L[s.key] }))
}
