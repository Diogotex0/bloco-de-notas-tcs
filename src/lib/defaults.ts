import type { DocApoio, DocRecebido, Filial, Grupo, Note, Regra, SectionKey } from './types'
import { cnpjClean } from './cnpj'

export const PP = 'Procuração Particular'

export const DOC_TIPOS = [
  'Estatuto Social',
  'Contrato Social',
  'Ata de Reunião ou Assembleia de Sócios',
  'Ata de Assembleia Geral Ordinária',
  'Ata de Reunião do Conselho de Administração',
  'Procuração Pública',
  PP,
  'Substabelecimento',
  'Procuração Padrão',
  'Regulamento',
  'Regimento Interno',
]

export const ORIGENS = ['Busca', 'Junta Comercial', 'Sharefiche 1', 'Sharefiche 2']

export const SUGESTOES_GRUPO = ['ADMINISTRADOR', 'DIRETOR', 'PROCURADOR', 'SÓCIO ADMINISTRADOR', 'CONSELHEIRO']

export const SECTIONS: { key: SectionKey; title: string; desc: string; optional?: boolean }[] = [
  { key: 'proposta', title: 'Proposta', desc: 'CNPJ, número e razão social' },
  { key: 'grupos', title: 'Grupos e mandatos', desc: 'Quem consta no documento e até quando' },
  { key: 'docs', title: 'Documentos', desc: 'Recebidos na proposta e de apoio' },
  { key: 'outorga', title: 'Validade da outorga', desc: 'Emissão, prazo e vencimento', optional: true },
  { key: 'garantidor', title: 'Garantidor', desc: 'Consulta à base de garantias' },
  { key: 'filiais', title: 'Filiais', desc: 'CNPJs e réplica' },
  { key: 'assinaturas', title: 'Formas de assinatura', desc: 'Grupos, limites e autorizações', optional: true },
  { key: 'anotacoes', title: 'Anotações', desc: 'Observações livres', optional: true },
]

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const novoGrupo = (nome = ''): Grupo => ({ id: uid(), nome, inicio: '', duracao: '', indeterminado: false })
export const novoRecebido = (): DocRecebido => ({
  id: uid(), tipo: '', tipoOutro: '', valMeio: 'ITI', valMeioOutro: '', validado: false,
})
export const novoApoio = (): DocApoio => ({
  ...novoRecebido(), origem: '', origemOutro: '', data: '', anexado: false,
})
export const novaFilial = (cnpj: string): Filial => ({ id: uid(), cnpj: cnpjClean(cnpj), replica: null })
export const novaRegra = (): Regra => ({
  id: uid(), grupos: [], modo: 'isolado', limite: '', semLimite: false, requerAut: false, autorizacao: '',
})

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
    outorga: { emissao: '', qtd: '1', unidade: 'anos', indeterminada: false },
    garantidor: null,
    dataGarantias: '',
    temFiliais: null,
    filiais: [],
    regras: [],
    quoruns: '',
    anotacoes: '',
  }
}

export function notaVazia(n: Note) {
  return (
    !n.cnpj && !n.proposta && !n.razaoSocial && !n.razaoAlterada && !n.receita &&
    !n.grupos.length && !n.docsRecebidos.length && !n.docsApoio.length &&
    !n.outorga.emissao && !n.outorga.indeterminada && n.garantidor === null &&
    n.temFiliais === null && !n.filiais.length && !n.regras.length && !n.quoruns.trim() && !n.anotacoes.trim()
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
  if (!['anos', 'meses'].includes(n.outorga.unidade)) n.outorga.unidade = 'anos'
  n.grupos = list(n.grupos, () => novoGrupo())
  n.docsRecebidos = list(n.docsRecebidos, novoRecebido)
  n.docsApoio = list(n.docsApoio, novoApoio)
  n.filiais = list(n.filiais, () => novaFilial('')).map((f) => ({ ...f, cnpj: cnpjClean(f.cnpj) })).filter((f) => f.cnpj)
  n.regras = list(n.regras, novaRegra).map((r) => ({
    ...r,
    modo: r.modo === 'conjunto' ? 'conjunto' : 'isolado',
    grupos: Array.isArray(r.grupos) ? r.grupos.filter((g): g is string => typeof g === 'string') : [],
  }))
  return n
}
