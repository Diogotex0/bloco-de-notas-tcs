import { create } from 'zustand'
import { type LinkUtil, type Quorum, type Referencia, lerPlanilha, normalizar } from '../lib/planilha'
import { toast } from './toast'

/**
 * A planilha de referência carregada pelo usuário. Fica só neste navegador (localStorage),
 * não entra no backup das anotações e nunca é enviada para lugar nenhum.
 */
const CHAVE = 'bloco-poderes:referencia'

const ler = (): Referencia | null => {
  try {
    const raw = localStorage.getItem(CHAVE)
    if (!raw) return null
    const r = JSON.parse(raw) as Partial<Referencia>
    if (!r || typeof r !== 'object') return null
    return {
      arquivo: String(r.arquivo ?? ''),
      versao: String(r.versao ?? ''),
      carregadaEm: Number(r.carregadaEm) || 0,
      respostas: Array.isArray(r.respostas) ? r.respostas.map((x) => ({ titulo: String(x.titulo ?? ''), texto: String(x.texto ?? ''), obs: String(x.obs ?? '') })) : [],
      codigos: r.codigos && typeof r.codigos === 'object' ? r.codigos : {},
      quoruns: Array.isArray(r.quoruns) ? r.quoruns : [],
      quorumLegal: Array.isArray(r.quorumLegal) ? r.quorumLegal : [],
      links: Array.isArray(r.links) ? r.links : [],
    }
  } catch {
    return null
  }
}

interface RefState {
  ref: Referencia | null
  /** Janela de carregar/trocar a planilha. */
  gerenciar: boolean
  /** Janela das respostas prontas (com o título já escolhido, se veio de um atalho). */
  respostas: { aberta: boolean; inicial?: string }
}

export const useReferencia = create<RefState>(() => ({ ref: ler(), gerenciar: false, respostas: { aberta: false } }))

export const abrirGerenciarPlanilha = () => useReferencia.setState({ gerenciar: true })
export const abrirRespostas = (inicial?: string) => useReferencia.setState({ respostas: { aberta: true, inicial } })

export async function carregarPlanilha(file: File) {
  try {
    const ref = await lerPlanilha(file)
    try {
      localStorage.setItem(CHAVE, JSON.stringify(ref))
    } catch {
      toast('Planilha lida, mas o navegador não deixou guardar. Ela vale só até fechar a aba.', { type: 'warn' })
    }
    useReferencia.setState({ ref })
    toast(`Planilha carregada${ref.versao ? ` (${ref.versao})` : ''}`, { type: 'success' })
    return true
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Não foi possível ler a planilha', { type: 'danger', duration: 5000 })
    return false
  }
}

export function removerPlanilha() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* ignora */
  }
  useReferencia.setState({ ref: null })
}

/* ---------- Consultas ---------- */

/** Links da Junta Comercial do estado. */
export function linksJunta(ref: Referencia | null, uf: string): LinkUtil | undefined {
  if (!ref || !uf) return undefined
  return ref.links.find((l) => l.uf === uf && /JUNTA/.test(normalizar(l.nome)))
}

/** Primeiro link cujo nome bate com o padrão (ex.: /ITI/, /CVM.*POSTERIOR/). */
export function linkPorNome(ref: Referencia | null, padrao: RegExp): LinkUtil | undefined {
  return ref?.links.find((l) => padrao.test(normalizar(l.nome)))
}

/** Quórum da planilha para o tipo societário da anotação. */
export function quorumDoTipo(ref: Referencia | null, padrao: RegExp | null): Quorum | undefined {
  if (!ref || !padrao) return undefined
  return ref.quoruns.find((q) => padrao.test(normalizar(q.tipo)))
}

// Mantém abas abertas em sincronia.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) useReferencia.setState({ ref: ler() })
  })
}
