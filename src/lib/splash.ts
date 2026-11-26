import novidades from '../novidades.json'
import { fmtDate } from './dates'
import { toast } from '../store/toast'

/**
 * Tela de carregamento: some quando o site termina de carregar.
 * Se a versão mudou desde a última visita, vira "Site atualizado" com a lista de novidades.
 * Para lançar uma versão nova: edite src/novidades.json (versao + itens).
 */
const CHAVE = 'bloco-poderes:versao'
const MINIMO_MS = 0

function esconder(el: HTMLElement) {
  el.classList.add('saindo')
  window.setTimeout(() => el.remove(), 250)
}

function mostrarNovidades(el: HTMLElement) {
  const lista = document.getElementById('sp-lista')
  const titulo = document.getElementById('sp-titulo')
  const selo = document.getElementById('sp-selo')
  const botao = document.getElementById('sp-comecar') as HTMLButtonElement | null
  if (!lista || !botao) return esconder(el)

  if (titulo) titulo.textContent = 'Site atualizado'
  if (selo) selo.textContent = `Versão de ${fmtDate(novidades.data)}`
  lista.replaceChildren(
    ...novidades.itens.map((t) => {
      const li = document.createElement('li')
      li.textContent = t
      return li
    }),
  )
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Site atualizado: novidades')
  el.classList.add('novidade')

  const fechar = () => {
    document.removeEventListener('keydown', onKey)
    esconder(el)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') fechar()
  }
  botao.addEventListener('click', fechar, { once: true })
  document.addEventListener('keydown', onKey)
  window.setTimeout(() => botao.focus(), 300)
}

/** Chamado quando o site terminou de montar. */
export function concluirCarregamento() {
  const el = document.getElementById('splash')
  if (!el) return
  let anterior: string | null = null
  let jaUsava = false
  try {
    anterior = localStorage.getItem(CHAVE)
    // Quem já usava o site antes deste aviso existir também deve ver as novidades.
    jaUsava = anterior === null && !!localStorage.getItem('bloco-poderes:notas')
    localStorage.setItem(CHAVE, novidades.versao)
  } catch {
    /* sem armazenamento: só esconde a tela */
  }
  const forcar = new URLSearchParams(location.search).has('novidades') // para testar: ?novidades
  const atualizou = forcar || jaUsava || (anterior !== null && anterior !== novidades.versao)
  const espera = Math.max(0, MINIMO_MS - performance.now())
  window.setTimeout(() => (atualizou ? mostrarNovidades(el) : esconder(el)), espera)
}

/** Com o site aberto, confere de vez em quando se saiu uma versão nova. */
export function vigiarAtualizacoes() {
  if (import.meta.env.DEV || location.protocol === 'file:') return
  let avisado = false
  const checar = async () => {
    if (avisado) return
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) return
      const j = (await r.json()) as { versao?: string }
      if (j.versao && j.versao !== novidades.versao) {
        avisado = true
        toast('Saiu uma versão nova do site.', {
          type: 'info',
          duration: 1e9,
          action: { label: 'Atualizar', run: () => location.reload() },
        })
      }
    } catch {
      /* sem internet: tenta depois */
    }
  }
  window.setInterval(checar, 5 * 60 * 1000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checar()
  })
}
