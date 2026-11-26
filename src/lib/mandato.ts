import type { Grupo, Note } from './types'
import { PRORROGACAO_DIAS, tipoSocietario } from './defaults'
import { addDays, parseISO } from './dates'

/** Grupo de procuradores (inclusive substabelecidos): o nome diz. */
export const ehProcurador = (g: Grupo) => /PROCURAD|SUBSTAB/i.test(g.nome)

/** A prorrogação de 120 dias só vale para mandato de diretor/administrador, com data de fim. */
export const podeProrrogar = (g: Grupo) => !g.indeterminado && !ehProcurador(g)

export const ehSA = (n: Pick<Note, 'tipoSocietario'>) => !!tipoSocietario(n)?.sa

/** Até quando o grupo vale de fato: fim do mandato, mais 120 dias se tiver prorrogação. null = indeterminado ou sem data. */
export function vigencia(g: Grupo): Date | null {
  if (g.indeterminado) return null
  const fim = parseISO(g.duracao)
  if (!fim) return null
  return g.prorrogacao && podeProrrogar(g) ? addDays(fim, PRORROGACAO_DIAS) : fim
}

export const temProrrogacao = (g: Grupo) => g.prorrogacao && podeProrrogar(g) && !!parseISO(g.duracao)

/**
 * Fim do mandato da diretoria: a maior vigência entre os grupos que não são de procuradores.
 * Usado para limitar procuração "por prazo indeterminado" em S/A (art. 144, parágrafo único, da Lei das S/A).
 */
export function fimDiretoria(n: Note): Date | null {
  const datas = n.grupos.filter((g) => !ehProcurador(g)).map(vigencia).filter((d): d is Date => !!d)
  if (!datas.length) return null
  return datas.reduce((a, b) => (b > a ? b : a))
}

/** S/A com procuração sem prazo: precisa ir até o fim do mandato da diretoria. */
export const procuracaoSemPrazoSA = (n: Note, g: Grupo) => ehSA(n) && ehProcurador(g) && g.indeterminado

/** Grupo que recebeu por substabelecimento e passa do prazo de quem substabeleceu. Devolve o limite. */
export function excessoSubstabelecimento(n: Note, g: Grupo): { origem: Grupo; limite: Date } | null {
  if (!g.substabeleceuDe) return null
  const origem = n.grupos.find((x) => x.id === g.substabeleceuDe)
  if (!origem) return null
  const limite = vigencia(origem)
  if (!limite) return null // quem substabeleceu não tem prazo: não há limite
  const v = vigencia(g)
  if (g.indeterminado || (v && v > limite)) return { origem, limite }
  return null
}
