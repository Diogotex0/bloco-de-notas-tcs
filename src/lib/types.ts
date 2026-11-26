export type Tri = boolean | null

export interface Grupo {
  id: string
  nome: string
  inicio: string // yyyy-mm-dd
  duracao: string // fim do mandato, yyyy-mm-dd
  indeterminado: boolean
  /** Soma os 120 dias de prorrogação automática do mandato (diretores/administradores). */
  prorrogacao: boolean
  /** Id do grupo que substabeleceu os poderes para este (vazio = não veio de substabelecimento). */
  substabeleceuDe: string
}

export interface DocRecebido {
  id: string
  tipo: string
  tipoOutro: string
  valMeio: 'ITI' | 'Outro'
  valMeioOutro: string
  validado: boolean
  data: string // data do documento
  /** Procuração pública: livro e folha do cartório. */
  livro: string
  folha: string
  /** Documento utilizado que foi retirado da JUCESP (precisa ir anexado na proposta). */
  jucesp: boolean
  /** Plataforma da assinatura da procuração particular (D4Sign, Clicksign…). Vazio = não informada. */
  plataforma: string
  /** Tentou validar e não conseguiu: precisa pendenciar o cliente. */
  semValidacao: boolean
}

export interface DocApoio extends DocRecebido {
  origem: string
  origemOutro: string
  /** Nº da proposta anterior, quando o documento foi achado numa proposta antiga. */
  propostaAnterior: string
  anexado: boolean
}

export interface Filial {
  id: string
  cnpj: string // só letras e números
  replica: Tri
}

export type Situacao = 'analise' | 'aguardando' | 'finalizada'

export interface Note {
  id: string
  createdAt: number
  updatedAt: number
  situacao: Situacao
  /** Data em que foi para a lixeira (0 = não está na lixeira). */
  excluidaEm: number
  /** Se já ofereceu copiar dados de outra análise do mesmo CNPJ. */
  reaproveitar: '' | 'feito' | 'ignorado'
  /** Anexos que o analista confirmou ter colocado na proposta. */
  anexosOk: string[]
  /** Nota rápida de cada etapa: lembretes que não entram no texto final. */
  notasEtapa: Partial<Record<SectionKey, string>>
  cnpj: string
  proposta: string
  razaoSocial: string
  razaoAlterada: boolean
  /** Tipo societário (LTDA, S/A, Cooperativa…). Vazio = não informado. */
  tipoSocietario: string
  /** Sigla do estado da empresa, para achar a Junta Comercial. */
  uf: string
  receita: '' | 'ativo' | 'inativo'
  grupos: Grupo[]
  docsRecebidos: DocRecebido[]
  docsApoio: DocApoio[]
  garantidor: Tri
  dataGarantias: string
  temFiliais: Tri
  filiais: Filial[]
  anotacoes: string
  /** Se houve alinhamento (com gerente, jurídico…). null = ainda não respondido. */
  temAlinhamento: Tri
  /** Texto do alinhamento, quando houve. Entra no texto final. */
  alinhamento: string
}

export type SectionKey =
  | 'proposta'
  | 'grupos'
  | 'docs'
  | 'garantidor'
  | 'filiais'
  | 'anotacoes'
