import type { DocApoio, DocRecebido, Filial, Grupo, Note, SectionKey } from './types'
import { cnpjClean } from './cnpj'
import { moneyFull } from './money'

export const PP = 'Procuração Particular'
export const PUB = 'Procuração Pública'

export const DOC_TIPOS = [
  'Estatuto Social',
  'Contrato Social',
  'Ata de Reunião ou Assembleia de Sócios',
  'Ata de Assembleia Geral Ordinária',
  'Ata de Reunião do Conselho de Administração',
  'Ata de Eleição',
  'Ata de Autorização',
  PUB,
  PP,
  'Substabelecimento',
  'Procuração Padrão',
  'Regulamento',
  'Regimento Interno',
]

export const ORIGENS = ['Busca Ai', 'Junta Comercial', 'Sharefiche 1', 'Sharefiche 2', 'Proposta anterior']

/** Data da base de garantias usada em toda anotação nova. */
export const DATA_BASE_GARANTIAS = '2026-10-23'

export const SUGESTOES_GRUPO = ['ADMINISTRADOR', 'DIRETOR', 'PROCURADOR', 'SÓCIO ADMINISTRADOR', 'CONSELHEIRO']

export const SECTIONS: { key: SectionKey; title: string; desc: string; optional?: boolean }[] = [
  { key: 'proposta', title: 'Proposta', desc: 'CNPJ, número e razão social' },
  { key: 'grupos', title: 'Grupos e mandatos', desc: 'Quem consta no documento e até quando' },
  { key: 'docs', title: 'Documentos', desc: 'Recebidos na proposta e de apoio' },
  { key: 'garantidor', title: 'Garantidor', desc: 'Consulta à base de garantias' },
  { key: 'filiais', title: 'Filiais', desc: 'CNPJs e réplica' },
  { key: 'anotacoes', title: 'Anotações', desc: 'Formas de assinatura, quóruns e observações', optional: true },
]

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const novoGrupo = (nome = ''): Grupo => ({ id: uid(), nome, inicio: '', duracao: '', indeterminado: false })
export const novoRecebido = (): DocRecebido => ({
  id: uid(), tipo: '', tipoOutro: '', valMeio: 'ITI', valMeioOutro: '', validado: false, data: '', livro: '', folha: '', jucesp: false,
})
export const novoApoio = (): DocApoio => ({
  ...novoRecebido(), origem: '', origemOutro: '', propostaAnterior: '', anexado: false,
})
export const novaFilial = (cnpj: string): Filial => ({ id: uid(), cnpj: cnpjClean(cnpj), replica: null })

export function novaNota(): Note {
  const now = Date.now()
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    situacao: 'analise',
    excluidaEm: 0,
    reaproveitar: '',
    anexosOk: [],
    notasEtapa: {},
    cnpj: '',
    proposta: '',
    razaoSocial: '',
    razaoAlterada: false,
    receita: '',
    grupos: [],
    docsRecebidos: [],
    docsApoio: [],
    garantidor: null,
    dataGarantias: '',
    temFiliais: null,
    filiais: [],
    anotacoes: '',
  }
}

export function notaVazia(n: Note) {
  return (
    !n.cnpj && !n.proposta && !n.razaoSocial && !n.razaoAlterada && !n.receita &&
    !n.grupos.length && !n.docsRecebidos.length && !n.docsApoio.length &&
    n.garantidor === null &&
    n.temFiliais === null && !n.filiais.length && !n.anotacoes.trim()
  )
}

// ---------- Normalização: protege contra backups antigos, incompletos ou corrompidos ----------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

function shape<T extends object>(src: unknown, def: T): T {
  const s = isObj(src) ? src : {}
  const out = { ...def } as Obj
  for (const k of Object.keys(def)) {
    const d = (def as Obj)[k]
    const v = s[k]
    if (Array.isArray(d)) out[k] = Array.isArray(v) ? v : []
    else if (d === null) out[k] = v === true || v === false ? v : null
    else if (isObj(d)) out[k] = shape(v, d)
    else if (typeof v === typeof d) out[k] = v
  }
  return out as T
}

const list = <T extends { id: string }>(arr: unknown[], make: () => T): T[] =>
  arr.filter(isObj).map((x) => {
    const item = shape(x, make())
    if (!item.id) item.id = uid()
    return item
  })

export function normalizarNota(raw: unknown): Note | null {
  if (!isObj(raw)) return null
  const n = shape(raw, novaNota())
  if (!n.id || typeof raw.id !== 'string') n.id = uid()
  if (!['', 'ativo', 'inativo'].includes(n.receita)) n.receita = ''
  if (!['analise', 'aguardando', 'finalizada'].includes(n.situacao)) n.situacao = 'analise'
  if (!['', 'feito', 'ignorado'].includes(n.reaproveitar)) n.reaproveitar = ''
  n.anexosOk = n.anexosOk.filter((x): x is string => typeof x === 'string')
  const notasRaw = isObj(raw.notasEtapa) ? raw.notasEtapa : {}
  n.notasEtapa = {}
  for (const s of SECTIONS) {
    const v = notasRaw[s.key]
    if (typeof v === 'string' && v.trim()) n.notasEtapa[s.key] = v
  }
  n.grupos = list(n.grupos, () => novoGrupo())
  n.docsRecebidos = list(n.docsRecebidos, novoRecebido)
  // "Busca" passou a se chamar "Busca Ai".
  n.docsApoio = list(n.docsApoio, novoApoio).map((d) => (d.origem === 'Busca' ? { ...d, origem: 'Busca Ai' } : d))
  n.filiais = list(n.filiais, () => novaFilial('')).map((f) => ({ ...f, cnpj: cnpjClean(f.cnpj) })).filter((f) => f.cnpj)
  // A etapa "Formas de assinatura" saiu: o que estava preenchido vai para as anotações.
  const assinaturas = assinaturasEmTexto(raw, n.grupos)
  if (assinaturas) n.anotacoes = n.anotacoes.trim() ? `${n.anotacoes.trimEnd()}\n\n${assinaturas}` : assinaturas
  return n
}

/** Converte as formas de assinatura e os quóruns de anotações antigas em texto (para as anotações). */
function assinaturasEmTexto(raw: Obj, grupos: Grupo[]): string {
  const regras = Array.isArray(raw.regras) ? raw.regras.filter(isObj) : []
  const quoruns = typeof raw.quoruns === 'string' ? raw.quoruns.trim() : ''
  const L: string[] = []
  if (regras.length) {
    L.push('Formas de assinatura:')
    for (const r of regras) {
      const ids = Array.isArray(r.grupos) ? r.grupos : []
      const nomes = ids.map((id) => grupos.find((g) => g.id === id)?.nome.trim() ?? '').filter(Boolean)
      const conjunto = r.modo === 'conjunto'
      const quem = nomes.length ? nomes.join(conjunto ? ' + ' : ' ou ') : '(grupos não informados)'
      const modo = conjunto ? (nomes.length === 1 ? 'em conjunto entre si' : 'em conjunto') : 'isoladamente'
      const limite = typeof r.limite === 'string' ? r.limite.replace(/\D/g, '') : ''
      const lim = r.semLimite === true ? 'sem limite de valor' : limite ? `até ${moneyFull(limite)}` : 'limite não informado'
      const aut = typeof r.autorizacao === 'string' ? r.autorizacao.trim() : ''
      L.push(`- ${quem} · ${modo} · ${lim}${r.requerAut === true ? ` · requer autorização${aut ? `: ${aut}` : ''}` : ''}`)
    }
  }
  if (quoruns) L.push(...(L.length ? [''] : []), 'Quóruns e autorizações:', quoruns)
  return L.join('\n')
}
