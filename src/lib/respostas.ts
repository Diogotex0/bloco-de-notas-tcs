import type { Note } from './types'
import { cnpjFormat } from './cnpj'
import { fmtDate } from './dates'
import { docFrase, juntar } from './finalizacao'

/** Marcadores que a planilha usa para "preencha aqui". */
export const RE_LACUNA = /X{2,}(?:\/X{2,}){0,2}|x{2}\/x{2}\/x{2,4}|_\/_\/_|\((?:COLOCAR|DESCREVER)[^)]*\)|DESCREVER O DOCUMENTO|COLOCAR[A-Z]{4,}/g

export const lacunas = (texto: string) => texto.match(RE_LACUNA) ?? []

/**
 * Preenche numa resposta da planilha só o que dá para saber com certeza pela anotação:
 * razão social da proposta, data da base de garantias, grupos cadastrados, documentos de apoio e filiais replicadas.
 * O que pode ser de outra empresa (DSO, por exemplo) ou exige escolha continua marcado.
 */
export function preencher(texto: string, n: Note): string {
  let t = texto
  const razao = n.razaoSocial.trim()
  // Só onde a planilha pede a empresa DA PROPOSTA ("empresa XXXXX" pode ser outra, como no DSO).
  if (razao) t = t.replace(/COLOCAR\s*O?\s*NOME\s*DA\s*EMPRESA\s*DA\s*PROPOSTA/gi, razao)

  const dataGar = fmtDate(n.dataGarantias)
  if (dataGar) t = t.replace(/(planilha\s+(?:do\s+dia\s+|de\s+|datada\s+de\s+))X{2}\/X{2}\/X{4}/gi, `$1${dataGar}`)

  const grupos = n.grupos.map((g) => g.nome.trim()).filter(Boolean)
  if (grupos.length) t = t.replace(/(Grupos?\s+[Cc]adastrados?:)[ \t]*(?:X{2,}|(?=\s*\n)|$)/gm, (_, rot: string) => `${rot} ${juntar(grupos)}`)

  if (n.docsApoio.length) t = t.replace(/(Documentos\s+de\s+apoio:\s*)X{2,}/gi, `$1${juntar(n.docsApoio.map(docFrase))}`)

  const replicadas = n.filiais.filter((f) => f.replica === true).map((f) => cnpjFormat(f.cnpj))
  if (replicadas.length) t = t.replace(/(replicados\s+para\s+os\s+CNPJs:\s*)X{2,}/gi, `$1${replicadas.join(', ')}`)
  return t
}
