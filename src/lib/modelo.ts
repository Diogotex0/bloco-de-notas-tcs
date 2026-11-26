/**
 * Modelo do texto final: quais blocos aparecem, em que ordem, com que rótulos.
 * O analista edita isso na tela "Modelo do texto", sem mexer no código.
 */

export type BlocoChave =
  | 'cnpj'
  | 'proposta'
  | 'razao'
  | 'receita'
  | 'grupos'
  | 'documentos'
  | 'garantidor'
  | 'razaoAlterada'
  | 'filiais'
  | 'anotacoes'

export interface Bloco {
  chave: BlocoChave
  ativo: boolean
  /** Linha em branco antes do bloco. */
  espacoAntes: boolean
  rotulos: Record<string, string>
}

export interface Modelo {
  versao: 1
  blocos: Bloco[]
}

/** Nome de cada bloco e dos rótulos que dá para trocar, com o texto padrão. */
export const CATALOGO: Record<BlocoChave, { nome: string; dica?: string; rotulos: { id: string; nome: string; padrao: string; longo?: boolean }[] }> = {
  cnpj: { nome: 'CNPJ', rotulos: [{ id: 'rotulo', nome: 'Rótulo', padrao: 'CNPJ' }] },
  proposta: { nome: 'Nº da proposta', rotulos: [{ id: 'rotulo', nome: 'Rótulo', padrao: 'Proposta' }] },
  razao: { nome: 'Razão social', rotulos: [{ id: 'rotulo', nome: 'Rótulo', padrao: 'Razão social' }] },
  receita: { nome: 'Receita Federal', dica: 'Só aparece se preenchido', rotulos: [{ id: 'rotulo', nome: 'Rótulo', padrao: 'Receita Federal' }] },
  grupos: {
    nome: 'Grupos e mandatos',
    rotulos: [
      { id: 'titulo', nome: 'Título', padrao: 'Grupos cadastrados' },
      { id: 'mandato', nome: 'Antes do mandato', padrao: 'Mandato' },
    ],
  },
  documentos: {
    nome: 'Documentos',
    rotulos: [
      { id: 'recebido', nome: 'Um recebido', padrao: 'Documento recebido' },
      { id: 'recebidos', nome: 'Vários recebidos', padrao: 'Documentos recebidos' },
      { id: 'apoio', nome: 'Um de apoio', padrao: 'Documento de apoio' },
      { id: 'apoios', nome: 'Vários de apoio', padrao: 'Documentos de apoio' },
    ],
  },
  garantidor: {
    nome: 'Frase do garantidor',
    dica: 'Use {é/não é} e {data} onde devem entrar os valores',
    rotulos: [{ id: 'frase', nome: 'Frase', padrao: 'Cliente {é/não é} garantidor de acordo com a base de garantias datada de {data}.', longo: true }],
  },
  razaoAlterada: {
    nome: 'Razão social alterada',
    rotulos: [
      { id: 'rotulo', nome: 'Rótulo', padrao: 'Razão social' },
      { id: 'sim', nome: 'Quando alterada', padrao: 'Alterada' },
      { id: 'nao', nome: 'Quando não alterada', padrao: 'Não alterada' },
    ],
  },
  filiais: {
    nome: 'Filiais',
    rotulos: [
      { id: 'rotulo', nome: 'Rótulo', padrao: 'Filiais' },
      { id: 'coube', nome: 'Grupo com réplica', padrao: 'Coube réplica' },
      { id: 'naoCoube', nome: 'Grupo sem réplica', padrao: 'Não coube réplica' },
      { id: 'definir', nome: 'Grupo a definir', padrao: 'A definir' },
    ],
  },
  anotacoes: { nome: 'Anotações', rotulos: [{ id: 'titulo', nome: 'Título', padrao: 'Anotações' }] },
}

const ORDEM_PADRAO: [BlocoChave, boolean][] = [
  ['cnpj', false],
  ['proposta', false],
  ['razao', false],
  ['receita', false],
  ['grupos', true],
  ['documentos', true],
  ['garantidor', true],
  ['razaoAlterada', false],
  ['filiais', false],
  ['anotacoes', true],
]

const rotulosPadrao = (k: BlocoChave) => Object.fromEntries(CATALOGO[k].rotulos.map((r) => [r.id, r.padrao]))

export const modeloPadrao = (): Modelo => ({
  versao: 1,
  blocos: ORDEM_PADRAO.map(([chave, espacoAntes]) => ({ chave, ativo: true, espacoAntes, rotulos: rotulosPadrao(chave) })),
})

/** Valida um modelo vindo do armazenamento ou de um arquivo importado. */
export function normalizarModelo(raw: unknown): Modelo {
  const base = modeloPadrao()
  const blocosRaw = raw && typeof raw === 'object' && Array.isArray((raw as { blocos?: unknown }).blocos) ? (raw as { blocos: unknown[] }).blocos : null
  if (!blocosRaw) return base
  const vistos = new Set<BlocoChave>()
  const blocos: Bloco[] = []
  for (const b of blocosRaw) {
    if (!b || typeof b !== 'object') continue
    const o = b as Record<string, unknown>
    const chave = o.chave as BlocoChave
    if (!(chave in CATALOGO) || vistos.has(chave)) continue
    vistos.add(chave)
    const rot = rotulosPadrao(chave)
    const rRaw = o.rotulos && typeof o.rotulos === 'object' ? (o.rotulos as Record<string, unknown>) : {}
    for (const id of Object.keys(rot)) if (typeof rRaw[id] === 'string') rot[id] = rRaw[id] as string
    blocos.push({ chave, ativo: o.ativo !== false, espacoAntes: o.espacoAntes === true, rotulos: rot })
  }
  // Blocos que faltarem (ex.: modelo antigo) entram no fim.
  for (const b of base.blocos) if (!vistos.has(b.chave)) blocos.push(b)
  return { versao: 1, blocos }
}

export const rotulo = (m: Modelo, chave: BlocoChave, id: string) =>
  m.blocos.find((b) => b.chave === chave)?.rotulos[id] ?? CATALOGO[chave].rotulos.find((r) => r.id === id)?.padrao ?? ''
