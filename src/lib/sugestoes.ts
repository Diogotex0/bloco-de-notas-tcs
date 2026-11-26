import type { DocRecebido, Note } from './types'
import { PLATAFORMAS, PP, tipoSocietario } from './defaults'
import { docLabel } from './analyze'
import { analiseAnterior } from './comparar'
import { fmtDate, today } from './dates'
import { ehProcurador, vigencia } from './mandato'
import { normalizar, type Referencia } from './planilha'

/** Uma resposta da planilha que combina com a situação da anotação. */
export interface Sugestao {
  /** Título exato da resposta na planilha. */
  titulo: string
  /** Por que está sendo sugerida. */
  motivo: string
}

const SOCIETARIOS = ['CONTRATO SOCIAL', 'ESTATUTO SOCIAL']

/** Título da resposta da planilha que bate com o padrão (comparando sem acento, em maiúsculas). */
function acharResposta(ref: Referencia, padrao: RegExp) {
  return ref.respostas.find((r) => padrao.test(normalizar(r.titulo)))?.titulo
}

/** Resposta de pendência para a plataforma de assinatura que não deu para validar. */
export function respostaDaPlataforma(ref: Referencia | null, d: Pick<DocRecebido, 'plataforma'>) {
  if (!ref) return undefined
  const p = PLATAFORMAS.find((x) => x.nome === d.plataforma)
  if (p && !p.resposta) return undefined // manuscrita: não há texto pronto
  return acharResposta(ref, p?.resposta ?? /PENDENCIA GENERICA/) ?? acharResposta(ref, /PENDENCIA GENERICA/)
}

const mesmoDoc = (a: DocRecebido, b: DocRecebido) => !!a.tipo && a.tipo === b.tipo && docLabel(a) === docLabel(b) && !!a.data && a.data === b.data

/**
 * Respostas prontas que fazem sentido para esta anotação, a partir do que foi preenchido.
 * Só sugere: quem decide e envia é o analista.
 */
export function sugestoes(n: Note, ref: Referencia | null, notas: Note[]): Sugestao[] {
  if (!ref?.respostas.length) return []
  const out: Sugestao[] = []
  const add = (padrao: RegExp, motivo: string) => {
    const titulo = acharResposta(ref, padrao)
    if (titulo && !out.some((s) => s.titulo === titulo)) out.push({ titulo, motivo })
  }

  // Procuração particular que não deu para validar: a pendência da plataforma.
  for (const d of [...n.docsRecebidos, ...n.docsApoio]) {
    if (d.tipo !== PP || d.validado || !d.semValidacao) continue
    const titulo = respostaDaPlataforma(ref, d)
    if (titulo && !out.some((s) => s.titulo === titulo))
      out.push({ titulo, motivo: `Procuração particular${d.plataforma ? ` (${d.plataforma})` : ''} não validada` })
  }

  // Diretoria/administração com mandato vencido.
  const vencidos = n.grupos.filter((g) => {
    const v = vigencia(g)
    return !ehProcurador(g) && !!v && v < today()
  })
  if (vencidos.length)
    add(
      /REPRESENTANTES LEGAIS COM PODERES VENCIDOS/,
      `${vencidos.map((g) => g.nome.trim() || 'Grupo').join(', ')}: mandato vencido`,
    )

  // Documentos societários que faltam.
  const docs = [...n.docsRecebidos, ...n.docsApoio].filter((d) => d.tipo)
  const tipos = new Set(docs.map((d) => normalizar(docLabel(d))))
  if (docs.length && !SOCIETARIOS.some((t) => tipos.has(t))) add(/^FALTA CONTRATO/, 'Nenhum contrato ou estatuto social entre os documentos')
  if (tipos.has('ESTATUTO SOCIAL') && !tipos.has('ATA DE ELEICAO')) add(/^FALTA ATA DE ELEICAO/, 'Estatuto social sem ata de eleição')

  // Documento recebido igual ao de uma análise anterior do mesmo CNPJ.
  const ant = analiseAnterior(n, notas)
  if (ant) {
    const antes = [...ant.docsRecebidos, ...ant.docsApoio]
    const repetido = n.docsRecebidos.find((d) => antes.some((a) => mesmoDoc(d, a)))
    if (repetido) add(/^DUPLICIDADE/, `${docLabel(repetido)} de ${fmtDate(repetido.data)} já aparece na análise anterior deste CNPJ`)
  }

  // Fundo de investimento.
  if (tipoSocietario(n)?.nome === 'Fundo de investimento') {
    add(/FUNDO SITUACAO .?CANCELADO/, 'Fundo: use se estiver “Cancelado” na CVM')
    if (n.garantidor !== null)
      add(n.garantidor ? /CUSTODIANTE \(GARANTIDOR/ : /CUSTODIANTE \(NAO GARANTIDOR/, 'Fundo: se for cadastro de custodiante')
  }

  return out
}
