/**
 * Leitura da planilha de referência de poderes (.xlsx) direto no navegador.
 *
 * A planilha é material interno: o conteúdo dela NUNCA fica no código nem no repositório.
 * Cada pessoa carrega o próprio arquivo; o que é lido fica só no navegador dela (localStorage).
 */

export interface Resposta {
  titulo: string
  texto: string
  /** Observações que vêm junto do título na planilha (quando há). */
  obs: string
}

export interface Quorum {
  tipo: string
  omissao: string
  vedacao: string
}

export interface QuorumLegal {
  grupo: string
  situacao: string
  quorum: string
  artigo: string
}

export interface LinkUtil {
  nome: string
  urls: string[]
  /** Sigla do estado, para os links de Junta Comercial. */
  uf: string
}

export interface Referencia {
  arquivo: string
  /** Ex.: "Versão 31 - Junho/2026" (vazio se a planilha não informar). */
  versao: string
  carregadaEm: number
  respostas: Resposta[]
  /** Códigos de autorização e parâmetros: { A02: "…", P11: "…" }. */
  codigos: Record<string, string>
  quoruns: Quorum[]
  quorumLegal: QuorumLegal[]
  links: LinkUtil[]
}

type Celulas = Map<string, string> // "B12" -> texto
type Planilhas = Map<string, Celulas> // nome normalizado -> células

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

const limpar = (s: string) =>
  s
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function xml(texto: string) {
  return new DOMParser().parseFromString(texto, 'application/xml')
}

/** Texto de um <si> ou <is>: junta os <t>, ignorando a guia fonética (<rPh>). */
function textoRico(el: Element) {
  let s = ''
  for (const t of Array.from(el.getElementsByTagName('t'))) {
    if (t.parentElement?.localName === 'rPh') continue
    s += t.textContent ?? ''
  }
  return s
}

async function abrirXlsx(dados: Uint8Array): Promise<Planilhas> {
  const { unzipSync, strFromU8 } = await import('fflate')
  let arquivos: Record<string, Uint8Array>
  try {
    arquivos = unzipSync(dados, {
      filter: (f) => f.name === 'xl/workbook.xml' || f.name === 'xl/_rels/workbook.xml.rels' || f.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(f.name),
    })
  } catch {
    throw new Error('Não consegui abrir o arquivo. Ele precisa ser uma planilha .xlsx.')
  }
  const ler = (nome: string) => (arquivos[nome] ? strFromU8(arquivos[nome]) : '')
  if (!arquivos['xl/workbook.xml']) throw new Error('Não consegui abrir o arquivo. Ele precisa ser uma planilha .xlsx.')

  const compartilhados = Array.from(xml(ler('xl/sharedStrings.xml') || '<sst/>').getElementsByTagName('si')).map(textoRico)

  const rels = new Map<string, string>()
  for (const r of Array.from(xml(ler('xl/_rels/workbook.xml.rels')).getElementsByTagName('Relationship'))) {
    const alvo = (r.getAttribute('Target') ?? '').replace(/^\/?(xl\/)?/, '')
    rels.set(r.getAttribute('Id') ?? '', `xl/${alvo}`)
  }

  const out: Planilhas = new Map()
  for (const sh of Array.from(xml(ler('xl/workbook.xml')).getElementsByTagName('sheet'))) {
    const id = sh.getAttribute('r:id') ?? sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? ''
    const caminho = rels.get(id)
    if (!caminho || !arquivos[caminho]) continue
    const celulas: Celulas = new Map()
    for (const c of Array.from(xml(ler(caminho)).getElementsByTagName('c'))) {
      const ref = c.getAttribute('r')
      if (!ref) continue
      const t = c.getAttribute('t')
      let v = ''
      if (t === 'inlineStr') {
        const is = c.getElementsByTagName('is')[0]
        v = is ? textoRico(is) : ''
      } else {
        const ve = c.getElementsByTagName('v')[0]?.textContent ?? ''
        v = t === 's' ? (compartilhados[+ve] ?? '') : ve
      }
      v = limpar(v)
      if (v) celulas.set(ref, v)
    }
    out.set(normalizar(sh.getAttribute('name') ?? ''), celulas)
  }
  return out
}

/** Linhas da planilha que têm algum valor, como { linha, B: "...", C: "..." }. */
function linhas(cel: Celulas) {
  const porLinha = new Map<number, Record<string, string>>()
  cel.forEach((v, ref) => {
    const m = /^([A-Z]+)(\d+)$/.exec(ref)
    if (!m) return
    const n = +m[2]
    if (!porLinha.has(n)) porLinha.set(n, {})
    porLinha.get(n)![m[1]] = v
  })
  return [...porLinha.entries()].sort((a, b) => a[0] - b[0]).map(([linha, cols]) => ({ linha, ...cols }) as { linha: number } & Record<string, string>)
}

function acharPlanilha(p: Planilhas, ...nomes: string[]) {
  for (const nome of nomes) {
    const alvo = normalizar(nome)
    for (const [k, v] of p) if (k === alvo || k.startsWith(alvo)) return v
  }
  return undefined
}

function lerRespostas(cel?: Celulas): Resposta[] {
  if (!cel) return []
  return linhas(cel)
    .filter((l) => l.B && l.C && normalizar(l.B) !== 'ATIVIDADE')
    .map((l) => {
      const [titulo, ...resto] = l.B.split('\n')
      return { titulo: titulo.trim(), texto: l.C, obs: resto.join('\n').trim() }
    })
}

function lerCodigos(cel?: Celulas): Record<string, string> {
  const out: Record<string, string> = {}
  if (!cel) return out
  cel.forEach((v) => {
    const m = /^([AP])\s*0*(\d{1,3})\s*[-–—:]\s*([\s\S]+)$/.exec(v.trim())
    if (!m) return
    const codigo = `${m[1]}${m[2].padStart(2, '0')}`
    if (!out[codigo]) out[codigo] = m[3].replace(/\s+/g, ' ').trim()
  })
  return out
}

function lerQuoruns(cel?: Celulas): Quorum[] {
  if (!cel) return []
  const out: Quorum[] = []
  for (const l of linhas(cel)) {
    if (l.linha < 3) continue
    if (l.B && normalizar(l.B) === 'TIPO SOCIETARIO') continue
    const junta = (a: string, b?: string) => (b ? (a ? `${a}\n${b}` : b) : a)
    // Célula mesclada pode repetir o tipo na linha de baixo: aí é continuação, não um tipo novo.
    const continua = !l.B || (out.length > 0 && normalizar(l.B) === normalizar(out[out.length - 1].tipo))
    if (!continua) out.push({ tipo: l.B, omissao: l.C ?? '', vedacao: l.D ?? '' })
    else if (out.length && (l.C || l.D)) {
      const q = out[out.length - 1]
      q.omissao = junta(q.omissao, l.C)
      q.vedacao = junta(q.vedacao, l.D)
    }
  }
  return out.map((q) => ({ ...q, omissao: limpar(q.omissao), vedacao: limpar(q.vedacao) }))
}

function lerQuorumLegal(cel?: Celulas): QuorumLegal[] {
  if (!cel) return []
  const out: QuorumLegal[] = []
  let grupo = ''
  for (const l of linhas(cel)) {
    if (l.B && !l.C && !l.D) grupo = l.B
    else if (l.B && l.C && normalizar(l.B) !== 'SITUACAO') out.push({ grupo, situacao: l.B, quorum: l.C, artigo: l.D ?? '' })
  }
  return out
}

function lerLinks(cel?: Celulas): LinkUtil[] {
  if (!cel) return []
  return linhas(cel)
    .filter((l) => l.B && l.C)
    .map((l) => ({
      nome: l.B.replace(/\*+$/, '').trim(),
      urls: (l.C.match(/https?:\/\/[^\s"'<>]+/g) ?? []).map((u) => u.replace(/[.,;)]+$/, '')),
      uf: /\(([A-Z]{2})\)/.exec(l.B)?.[1] ?? '',
    }))
    .filter((l) => l.urls.length)
}

function lerVersao(p: Planilhas) {
  for (const cel of p.values()) {
    for (const v of cel.values()) {
      const m = /VERS[AÃ]O\s*(\d+)\s*[-–]\s*([A-ZÇÃÉ]+\s*\/\s*\d{4})/i.exec(v)
      if (m) {
        const mes = m[2].replace(/\s+/g, '').toLowerCase()
        return `Versão ${m[1]} · ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`
      }
    }
  }
  return ''
}

/** Lê o arquivo .xlsx e devolve só o que o bloco usa. */
export async function lerPlanilha(file: File): Promise<Referencia> {
  if (file.size > 40 * 1024 * 1024) throw new Error('Arquivo grande demais para ser a planilha de referência.')
  const p = await abrirXlsx(new Uint8Array(await file.arrayBuffer()))
  const ref: Referencia = {
    arquivo: file.name,
    versao: lerVersao(p),
    carregadaEm: Date.now(),
    respostas: lerRespostas(acharPlanilha(p, 'Finalizações - Devoluções', 'Finalizações')),
    codigos: lerCodigos(acharPlanilha(p, 'Autorizações')),
    quoruns: lerQuoruns(acharPlanilha(p, 'Quóruns')),
    quorumLegal: lerQuorumLegal(acharPlanilha(p, 'Quorum')),
    links: lerLinks(acharPlanilha(p, 'Juntas comerciais', 'Links')),
  }
  const achou = ref.respostas.length + Object.keys(ref.codigos).length + ref.quoruns.length + ref.links.length
  if (!achou) throw new Error('Essa planilha não tem as abas esperadas (Finalizações, Autorizações, Quóruns, Links).')
  return ref
}
