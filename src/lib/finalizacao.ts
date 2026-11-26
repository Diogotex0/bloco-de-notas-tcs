import type { DocApoio, DocRecebido, Grupo, Note } from './types'
import { PRORROGACAO_DIAS, PUB } from './defaults'
import { docLabel } from './analyze'
import { cnpjFormat } from './cnpj'
import { fmtDate } from './dates'
import { origemLabel } from './generate'
import { temProrrogacao, vigencia } from './mandato'

/**
 * Textos de finalização montados com o que já foi preenchido na anotação:
 * a observação para o cliente e o follow-up. Campo em branco vira "__/__/____" para chamar atenção.
 */

const VAZIO_DATA = '__/__/____'

/** "a", "a e b", "a, b e c". */
export function juntar(itens: string[]) {
  if (itens.length <= 1) return itens[0] ?? ''
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** "Procuração Pública, Livro 12, Folha 34, de 10/03/2026" ou "Contrato Social de 12/08/2025". */
export function docFrase(d: DocRecebido) {
  const nome = d.tipo ? docLabel(d) : 'Documento'
  const data = fmtDate(d.data) || VAZIO_DATA
  if (d.tipo === PUB) return `${nome}, Livro ${d.livro.trim() || '__'}, Folha ${d.folha.trim() || '__'}, de ${data}`
  return `${nome} de ${data}`
}

const apoioFrase = (d: DocApoio) => {
  const origem = d.origem ? origemLabel(d) : ''
  return origem ? `${docFrase(d)} (${origem})` : docFrase(d)
}

const nomeGrupo = (g: Grupo, i: number) => g.nome.trim() || `Grupo ${i + 1}`

/** Grupos com prorrogação de 120 dias e até quando ficam vigentes. */
function prorrogados(n: Note) {
  return n.grupos.flatMap((g, i) => (temProrrogacao(g) ? [{ nome: nomeGrupo(g, i), ate: fmtDate(vigencia(g)) }] : []))
}

function fraseProrrogacao(n: Note) {
  const p = prorrogados(n)
  if (!p.length) return ''
  const datas = [...new Set(p.map((x) => x.ate))]
  const ate = datas.length === 1 ? datas[0] : juntar(p.map((x) => `${x.ate} (${x.nome})`))
  return `Informamos que foi acrescentado o prazo adicional de ${PRORROGACAO_DIAS} dias ao término do mandato dos diretores/administradores de forma automática, conforme permitido em lei, permanecendo os poderes vigentes até ${ate}.`
}

/** Observação para o cliente. */
export function textoCliente(n: Note): string {
  if (!n.docsRecebidos.length) return ''
  const L: string[] = []
  let base = `Cadastro de poderes conforme ${juntar(n.docsRecebidos.map(docFrase))}.`
  if (n.docsApoio.length) base += ` Documentos de apoio: ${juntar(n.docsApoio.map(docFrase))}.`
  L.push(base)
  const prorr = fraseProrrogacao(n)
  if (prorr) L.push(prorr)
  return L.join('\n\n')
}

/** Follow-up interno. */
export function textoFollowUp(n: Note): string {
  const L: string[] = []
  const grupos = n.grupos.map(nomeGrupo)
  if (grupos.length) L.push(`${grupos.length === 1 ? 'Grupo cadastrado' : 'Grupos cadastrados'}: ${juntar(grupos)}`)

  if (n.docsRecebidos.length) L.push(`${n.docsRecebidos.length === 1 ? 'Documento utilizado' : 'Documentos utilizados'}: ${juntar(n.docsRecebidos.map(docFrase))}`)
  if (n.docsApoio.length) L.push(`Documentos de apoio: ${juntar(n.docsApoio.map(apoioFrase))}`)

  if (n.temFiliais === false) L.push('Não possui filial.')
  else if (n.temFiliais === true) {
    const lista = (v: boolean | null) => n.filiais.filter((f) => f.replica === v).map((f) => cnpjFormat(f.cnpj))
    const sim = lista(true)
    const nao = lista(false)
    const nd = lista(null)
    L.push(sim.length ? `Possui filial, poderes replicados para os CNPJs: ${sim.join(', ')}` : 'Possui filial, poderes não replicados.')
    if (nao.length) L.push(`Réplica não cabível para: ${nao.join(', ')}`)
    if (nd.length) L.push(`Réplica a definir: ${nd.join(', ')}`)
  }

  if (n.garantidor !== null) {
    const data = fmtDate(n.dataGarantias) || VAZIO_DATA
    L.push(
      n.garantidor
        ? `Base de garantidores consultada, cliente garantidor conforme planilha do dia ${data}. Poderes de garantias a terceiros mantidos/habilitados.`
        : `Base de garantidores consultada, cliente não garantidor conforme planilha do dia ${data}. Poderes de garantias a terceiros desabilitados.`,
    )
  }

  if (n.razaoAlterada) L.push('Razão social atualizada no SPA.')

  const p = prorrogados(n)
  if (p.length) L.push(`Prorrogação automática de mandato (${PRORROGACAO_DIAS} dias): ${juntar(p.map((x) => `${x.nome} vigente até ${x.ate}`))}.`)

  return L.join('\n')
}
