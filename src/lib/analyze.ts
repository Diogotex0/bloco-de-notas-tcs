import type { DocRecebido, Note, SectionKey } from './types'
import { PP, PUB } from './defaults'
import { cnpjClean, cnpjValido } from './cnpj'
import { fmtDate, parseISO, today } from './dates'
import { excessoSubstabelecimento, fimDiretoria, procuracaoSemPrazoSA, temProrrogacao, vigencia } from './mandato'

export type Level = 'block' | 'warn' | 'info'
export interface Issue {
  level: Level
  sec: SectionKey
  msg: string
  target: string // id do elemento para levar o usuário até o campo
}

export const docLabel = (d: DocRecebido) => (d.tipo === 'Outro' ? d.tipoOutro.trim() || 'Outro documento' : d.tipo)

const plural = (n: number, s: string, p: string) => (n === 1 ? s : p)

export function analisar(n: Note): Issue[] {
  const out: Issue[] = []
  const add = (level: Level, sec: SectionKey, msg: string, target: string) => out.push({ level, sec, msg, target })

  // 1. Proposta
  const c = cnpjClean(n.cnpj)
  if (!c) add('warn', 'proposta', 'Informe o CNPJ', 'f-cnpj')
  else if (!cnpjValido(c)) add('warn', 'proposta', 'CNPJ inválido ou incompleto', 'f-cnpj')
  if (!n.proposta.trim()) add('warn', 'proposta', 'Informe o número da proposta', 'f-proposta')
  if (!n.razaoSocial.trim()) add('warn', 'proposta', 'Informe a razão social', 'f-razao')
  if (n.razaoAlterada) add('info', 'proposta', 'Razão social alterada: atualize o cadastro', 'f-razaoAlterada')
  if (n.receita === 'inativo') add('info', 'proposta', 'CNPJ inativo na Receita Federal', 'f-receita')

  // 2. Grupos
  if (!n.grupos.length) add('warn', 'grupos', 'Cadastre ao menos um grupo', 'add-grupo')
  n.grupos.forEach((g, i) => {
    const nome = g.nome.trim() || `Grupo ${i + 1}`
    if (!g.nome.trim()) add('warn', 'grupos', `Grupo ${i + 1}: informe o nome`, `${g.id}-nome`)
    const ini = parseISO(g.inicio)
    if (!ini) add('warn', 'grupos', `${nome}: informe o início do mandato`, `${g.id}-inicio`)
    if (!g.indeterminado) {
      const fim = parseISO(g.duracao)
      if (!fim) add('warn', 'grupos', `${nome}: informe o fim do mandato ou marque indeterminado`, `${g.id}-duracao`)
      else if (ini && fim < ini) add('warn', 'grupos', `${nome}: o fim está antes do início`, `${g.id}-duracao`)
      else {
        const vig = vigencia(g) ?? fim
        if (vig < today())
          add('warn', 'grupos', `${nome}: mandato vencido em ${fmtDate(vig)}${temProrrogacao(g) ? ' (já com os 120 dias)' : ''}`, `${g.id}-duracao`)
        else if (fim < today()) add('info', 'grupos', `${nome}: mandato terminou em ${fmtDate(fim)}, vigente pela prorrogação até ${fmtDate(vig)}`, `${g.id}-prorrogacao`)
      }
    }
    if (procuracaoSemPrazoSA(n, g)) {
      const lim = fimDiretoria(n)
      add(
        'warn',
        'grupos',
        `${nome}: em S/A, procuração sem prazo vai até o fim do mandato da diretoria${lim ? ` (${fmtDate(lim)})` : ''}`,
        `${g.id}-indet`,
      )
    }
    const exc = excessoSubstabelecimento(n, g)
    if (exc)
      add(
        'warn',
        'grupos',
        `${nome}: o substabelecimento não pode passar do prazo de ${exc.origem.nome.trim() || 'quem substabeleceu'} (${fmtDate(exc.limite)})`,
        `${g.id}-duracao`,
      )
  })

  // 3. Documentos
  if (!n.docsRecebidos.length) add('warn', 'docs', 'Informe o documento recebido', 'add-recebido')
  const checkDoc = (d: DocRecebido, i: number, kind: string) => {
    const nome = d.tipo ? docLabel(d) : `${kind} ${i + 1}`
    if (!d.tipo) add('warn', 'docs', `${kind} ${i + 1}: selecione o tipo`, `${d.id}-tipo`)
    if (d.tipo === 'Outro' && !d.tipoOutro.trim()) add('warn', 'docs', `${kind} ${i + 1}: descreva o documento`, `${d.id}-tipoOutro`)
    if (d.tipo === PP) {
      if (!d.validado)
        add('block', 'docs', d.semValidacao ? `${nome}: não foi possível validar, pendencie o cliente` : `${nome}: validação pendente`, `${d.id}-validado`)
      if (d.valMeio === 'Outro' && !d.valMeioOutro.trim())
        add('warn', 'docs', `${nome}: informe o meio de validação`, `${d.id}-valMeioOutro`)
    }
    if (d.tipo === PUB) {
      if (!d.livro.trim()) add('warn', 'docs', `${nome}: informe o livro`, `${d.id}-livro`)
      if (!d.folha.trim()) add('warn', 'docs', `${nome}: informe a folha`, `${d.id}-folha`)
    }
    return nome
  }
  n.docsRecebidos.forEach((d, i) => {
    const nome = checkDoc(d, i, 'Documento utilizado')
    if (!parseISO(d.data)) add('warn', 'docs', `${nome}: informe a data do documento`, `${d.id}-data`)
  })
  n.docsApoio.forEach((d, i) => {
    const nome = checkDoc(d, i, 'Documento de apoio')
    if (!d.origem) add('warn', 'docs', `${nome}: informe de onde foi retirado`, `${d.id}-origem`)
    else if (d.origem === 'Outro' && !d.origemOutro.trim()) add('warn', 'docs', `${nome}: descreva a origem`, `${d.id}-origemOutro`)
    else if (d.origem === 'Proposta anterior' && !d.propostaAnterior.trim())
      add('warn', 'docs', `${nome}: informe o nº da proposta anterior`, `${d.id}-propostaAnterior`)
    if (!parseISO(d.data)) add('warn', 'docs', `${nome}: informe a data do documento`, `${d.id}-data`)
    if (d.origem === 'Junta Comercial' && !d.anexado)
      add('warn', 'docs', `${nome}: anexe na proposta (Junta Comercial)`, `${d.id}-anexado`)
  })

  // 4. Garantidor
  if (n.garantidor === null) add('warn', 'garantidor', 'Informe se o cliente é garantidor', 'f-garantidor')
  if (!parseISO(n.dataGarantias)) add('warn', 'garantidor', 'Informe a data da base de garantias', 'f-dataGarantias')

  // 5. Filiais
  if (n.temFiliais === null) add('warn', 'filiais', 'Informe se a empresa tem filiais', 'f-temFiliais')
  else if (n.temFiliais) {
    if (!n.filiais.length) add('warn', 'filiais', 'Adicione os CNPJs das filiais', 'f-filiaisInput')
    const nd = n.filiais.filter((f) => f.replica === null)
    if (nd.length)
      add('warn', 'filiais', `${nd.length} ${plural(nd.length, 'filial', 'filiais')} sem definição de réplica`, `fil-${nd[0].id}`)
    const inv = n.filiais.filter((f) => !cnpjValido(f.cnpj))
    if (inv.length)
      add('warn', 'filiais', `${inv.length} ${plural(inv.length, 'CNPJ de filial inválido', 'CNPJs de filial inválidos')}`, `fil-${inv[0].id}`)
  }

  // 6. Anotações
  if (n.temAlinhamento === null) add('warn', 'anotacoes', 'Informe se tem alinhamento', 'f-temAlinhamento')
  else if (n.temAlinhamento && !n.alinhamento.trim()) add('warn', 'anotacoes', 'Escreva o texto do alinhamento', 'f-alinhamento')

  const order: Record<Level, number> = { block: 0, warn: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}

export function temConteudo(n: Note, key: SectionKey) {
  if (key === 'anotacoes') return !!n.anotacoes.trim() || n.temAlinhamento !== null
  return true
}

export type NoteStatus = 'empty' | 'block' | 'warn' | 'ok'

export function statusDe(issues: Issue[]): Exclude<NoteStatus, 'empty'> {
  if (issues.some((i) => i.level === 'block')) return 'block'
  if (issues.some((i) => i.level === 'warn')) return 'warn'
  return 'ok'
}
