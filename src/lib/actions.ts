import type { Note } from './types'
import type { Issue } from './analyze'
import { analisar } from './analyze'
import { gerarTexto } from './generate'
import { DIAS_LIXEIRA, useNotes } from '../store/notes'
import { confirmar } from '../store/confirm'
import { pedirConferencia } from '../store/anexos'
import { anexosPendentes } from './anexos'
import { useUi } from '../store/ui'
import { toast } from '../store/toast'
import { doc, janela, menosMovimento, porId } from './janela'

const atual = () => {
  const s = useNotes.getState()
  return s.notes.find((n) => n.id === s.currentId) ?? null
}

/** Aplica uma remoção e oferece "Desfazer" por alguns segundos. */
export function removerComDesfazer(msg: string, fn: (n: Note) => void) {
  const antes = atual()
  if (!antes) return
  const snap = structuredClone(antes)
  useNotes.getState().editar(fn)
  toast(msg, {
    duration: 6000,
    action: { label: 'Desfazer', run: () => useNotes.getState().restaurar(snap) },
  })
}

export function excluirNota(id: string) {
  useNotes.getState().excluir(id)
  toast(`Movida para a lixeira. Fica lá por ${DIAS_LIXEIRA} dias.`, {
    duration: 7000,
    action: { label: 'Desfazer', run: () => useNotes.getState().tirarDaLixeira(id) },
  })
}

export async function excluirDeVez(id: string) {
  const ok = await confirmar({
    titulo: 'Excluir de vez?',
    texto: 'Esta anotação será apagada para sempre e não dá para recuperar.',
    botao: 'Excluir de vez',
  })
  if (!ok) return
  useNotes.getState().excluirDeVez(id)
  toast('Anotação apagada', { type: 'info' })
}

export async function esvaziarLixeira() {
  const q = useNotes.getState().notes.filter((n) => n.excluidaEm).length
  if (!q) return
  const ok = await confirmar({
    titulo: 'Esvaziar a lixeira?',
    texto: `${q} ${q === 1 ? 'anotação será apagada' : 'anotações serão apagadas'} para sempre. Não dá para recuperar.`,
    botao: 'Esvaziar lixeira',
  })
  if (!ok) return
  useNotes.getState().esvaziarLixeira()
  toast('Lixeira esvaziada', { type: 'info' })
}

/** Copia os dados de outra análise do mesmo CNPJ, com opção de desfazer. */
export function reaproveitar(origem: Note) {
  const antes = atual()
  if (!antes) return
  const snap = structuredClone(antes)
  const r = useNotes.getState().reaproveitarDe(origem.id)
  if (!r) return
  const extra = r.procuracaoResetada ? ' A validação da procuração particular precisa ser refeita.' : ''
  toast(`Dados copiados da proposta ${origem.proposta.trim() || 'anterior'}. Confira se algo mudou.${extra}`, {
    type: r.procuracaoResetada ? 'warn' : 'success',
    duration: 8000,
    action: { label: 'Desfazer', run: () => useNotes.getState().restaurar(snap) },
  })
}

/** Leva o usuário até o campo da pendência, abrindo a seção se estiver fechada. */
export function irPara(issue: Pick<Issue, 'sec' | 'target'>) {
  const ui = useUi.getState()
  const fechada = ui.aberta !== issue.sec
  ui.abrirEtapa(issue.sec)
  ui.setNav(false)
  ui.setMiniAba('etapas')
  window.setTimeout(() => {
    const el = porId(issue.target) ?? porId(`sec-${issue.sec}`)
    if (!el) return
    const reduz = menosMovimento()
    el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' })
    const foco = el.matches('input,select,textarea,button')
      ? el
      : el.querySelector<HTMLElement>('input:not([disabled]),select,textarea,button')
    foco?.focus({ preventScroll: true })
    const box = (el.closest('[data-flash]') as HTMLElement) ?? el
    box.classList.remove('flash')
    void box.offsetWidth
    box.classList.add('flash')
    window.setTimeout(() => box.classList.remove('flash'), 1300)
  }, fechada ? 340 : 40)
}

export async function copiarTexto(texto: string) {
  try {
    await janela().navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Alternativa para navegadores que bloqueiam a área de transferência.
    try {
      const d = doc()
      const ta = d.createElement('textarea')
      ta.value = texto
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
      d.body.appendChild(ta)
      ta.select()
      const ok = d.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Copia o texto final. Bloqueia se houver procuração particular sem validação. */
export async function copiarAnotacao(): Promise<'ok' | 'bloqueado' | 'erro' | 'vazio' | 'anexos'> {
  const n = atual()
  if (!n) return 'vazio'
  const bloqueio = analisar(n).find((i) => i.level === 'block')
  if (bloqueio) {
    toast(`${bloqueio.msg}. Confirme a validação e a evidência para liberar a cópia.`, { type: 'danger', duration: 5500 })
    irPara(bloqueio)
    return 'bloqueado'
  }
  // Antes de copiar, o analista confirma que anexou tudo na proposta.
  if (anexosPendentes(n).length) {
    pedirConferencia('copiar')
    return 'anexos'
  }
  return copiarFinal()
}

/** Copia o texto final (sem nova conferência). Usado depois que os anexos foram confirmados. */
export async function copiarFinal(): Promise<'ok' | 'erro' | 'vazio'> {
  const n = atual()
  if (!n) return 'vazio'
  const issues = analisar(n)
  const ok = await copiarTexto(gerarTexto(n))
  if (!ok) {
    toast('Não foi possível copiar. Selecione o texto na prévia e use Ctrl+C.', { type: 'danger' })
    return 'erro'
  }
  const pend = issues.filter((i) => i.level === 'warn').length
  toast(pend ? `Texto copiado · ${pend} ${pend === 1 ? 'pendência' : 'pendências'} em aberto` : 'Texto copiado', {
    type: pend ? 'warn' : 'success',
  })
  return 'ok'
}

/* ---------- Backup ---------- */
export function exportarBackup() {
  const { notes } = useNotes.getState()
  if (!notes.length) {
    toast('Ainda não há anotações para exportar', { type: 'warn' })
    return
  }
  const data = { app: 'bloco-de-poderes', versao: 1, exportadoEm: new Date().toISOString(), notes }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  a.href = url
  a.download = `bloco-de-poderes-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  toast(`Backup exportado com ${notes.length} ${notes.length === 1 ? 'anotação' : 'anotações'}`, { type: 'success' })
}

export async function importarBackup(file: File) {
  if (file.size > 25 * 1024 * 1024) {
    toast('Arquivo grande demais para ser um backup', { type: 'danger' })
    return
  }
  try {
    const raw = JSON.parse(await file.text())
    const r = useNotes.getState().importar(raw)
    const partes = []
    if (r.novas) partes.push(`${r.novas} ${r.novas === 1 ? 'nova' : 'novas'}`)
    if (r.atualizadas) partes.push(`${r.atualizadas} ${r.atualizadas === 1 ? 'atualizada' : 'atualizadas'}`)
    if (r.ignoradas) partes.push(`${r.ignoradas} já ${r.ignoradas === 1 ? 'estava' : 'estavam'} em dia`)
    toast(partes.length ? `Backup importado: ${partes.join(', ')}` : 'O arquivo não tinha anotações', {
      type: r.novas || r.atualizadas ? 'success' : 'info',
    })
  } catch {
    toast('Arquivo inválido. Use um backup exportado por este bloco de notas.', { type: 'danger' })
  }
}

/** Coloca o cursor num campo assim que ele aparecer na tela (espera as animações terminarem). */
export function focarQuandoExistir(id: string, limiteMs = 1500) {
  const inicio = performance.now()
  // Durante a troca de anotação o campo antigo ainda existe saindo da tela: espera o novo.
  const antigo = porId(id)
  const tentar = () => {
    const el = porId(id)
    if (el && el !== antigo && el.getClientRects().length) {
      el.focus()
      return
    }
    if (performance.now() - inicio < limiteMs) requestAnimationFrame(tentar)
  }
  requestAnimationFrame(tentar)
}

const URL_RECEITA = 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp'

/** Copia o CNPJ sem pontuação e abre a consulta da Receita numa aba nova. O CAPTCHA fica com o analista. */
export async function abrirReceita(cnpjLimpo: string) {
  const ok = await copiarTexto(cnpjLimpo)
  window.open(URL_RECEITA, '_blank', 'noopener,noreferrer')
  toast(ok ? 'CNPJ copiado. Cole no site da Receita com Ctrl+V.' : 'Abri a Receita, mas não consegui copiar o CNPJ.', {
    type: ok ? 'success' : 'warn',
  })
}
