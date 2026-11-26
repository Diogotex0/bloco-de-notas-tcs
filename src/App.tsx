import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, MotionConfig } from 'motion/react'
import { PictureInPicture2 } from 'lucide-react'
import { analisar } from './lib/analyze'
import { aoTeclar } from './lib/atalhos'
import { aoColar } from './lib/colar'
import { talvezLembrar } from './lib/lembrete'
import { janelaFlutuante } from './lib/janela'
import { fecharJanelaFlutuante } from './lib/pip'
import { useCurrent, useNotes } from './store/notes'
import { useUi } from './store/ui'
import { Sidebar } from './components/Sidebar'
import { SidePanel } from './components/SidePanel'
import { EmptyState, Topbar } from './components/Shell'
import { CopyButton } from './components/CopyButton'
import { SituacaoBar } from './components/SituacaoBar'
import { Etapas } from './components/Etapas'
import { FaixaAnexos } from './components/Anexos'
import { Overlays } from './components/Overlays'
import { MiniApp } from './components/MiniApp'
import { Button, cx } from './components/ui'
import { Stepper } from './components/Stepper'
import { Comparacao } from './components/Comparacao'

/** Atalhos, colar inteligente e lembrete de anexos na aba principal. */
function useEventosGlobais() {
  useEffect(() => {
    const aoSair = () => {
      // Se o foco foi para a janela flutuante, não é "sair".
      window.setTimeout(() => {
        if (document.hasFocus() || janelaFlutuante()?.document.hasFocus()) return
        talvezLembrar()
      }, 300)
    }
    const aoEsconder = () => document.hidden && aoSair()
    window.addEventListener('keydown', aoTeclar)
    document.addEventListener('paste', aoColar)
    window.addEventListener('blur', aoSair)
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('paste', aoColar)
      window.removeEventListener('blur', aoSair)
      document.removeEventListener('visibilitychange', aoEsconder)
    }
  }, [])
}

export default function App() {
  const n = useCurrent()
  const issues = useMemo(() => (n ? analisar(n) : []), [n])
  const bloqueado = issues.some((i) => i.level === 'block')
  const pip = useUi((s) => s.pip)
  const foco = useUi((s) => s.foco)
  const aberta = useUi((s) => s.aberta)
  useEventosGlobais()

  // Ao trocar de anotação, abre direto a primeira etapa que ainda tem algo pendente.
  const notaId = n?.id
  useEffect(() => {
    if (!notaId) return
    const nota = useNotes.getState().notes.find((x) => x.id === notaId)
    const pend = nota ? analisar(nota).find((i) => i.level !== 'info') : undefined
    useUi.getState().abrirEtapa(pend ? pend.sec : 'proposta')
    // Mostra na lista a aba onde a anotação aberta está (ex.: uma nova vai para "Abertas").
    if (nota) useUi.getState().setFiltro(nota.excluidaEm ? 'lixeira' : nota.situacao === 'finalizada' ? 'finalizadas' : 'abertas')
  }, [notaId])

  return (
    <MotionConfig reducedMotion="user">
      <div className={cx('min-h-dvh', !foco && 'lg:grid lg:grid-cols-[272px_minmax(0,1fr)]')}>
        {!foco && <Sidebar />}
        <main className="min-w-0">
          <Topbar n={pip ? null : n} bloqueado={bloqueado} />
          {pip ? (
            <NaJanelaFlutuante />
          ) : n && foco ? (
            // Modo foco: só a etapa atual, centralizada
            <motion.div
              key={`${n.id}-foco`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="mx-auto grid max-w-3xl gap-3.5 px-4 pt-5 pb-28 sm:px-6"
            >
              <Stepper n={n} issues={issues} />
              <FaixaAnexos />
              <Etapas n={n} issues={issues} somente={aberta ?? 'proposta'} />
            </motion.div>
          ) : n ? (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="mx-auto grid max-w-[1360px] gap-5 px-4 pt-5 pb-28 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:gap-6"
            >
              <div className="grid min-w-0 content-start gap-3.5">
                <SituacaoBar n={n} />
                <FaixaAnexos />
                <Comparacao n={n} />
                <Etapas n={n} issues={issues} />
              </div>
              <aside className="min-w-0">
                <SidePanel n={n} issues={issues} />
              </aside>
            </motion.div>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {/* Botão flutuante de copiar no celular */}
      {n && !pip && (
        <div className="fixed right-4 bottom-4 z-30 sm:hidden">
          <CopyButton bloqueado={bloqueado} />
        </div>
      )}

      {/* Avisos e confirmações aparecem na janela que está em uso */}
      {pip ? (
        createPortal(
          <MotionConfig reducedMotion="user">
            <MiniApp />
            <Overlays />
          </MotionConfig>,
          pip,
        )
      ) : (
        <Overlays />
      )}
    </MotionConfig>
  )
}

/** O que aparece na aba enquanto a anotação está na janela flutuante. */
function NaJanelaFlutuante() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center"
    >
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
        <PictureInPicture2 className="size-7" />
      </div>
      <h2 className="text-[19px] font-semibold tracking-[-0.02em]">O bloco está na janela flutuante</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-2">
        Ela fica por cima das outras janelas. Arraste para um canto da tela e mude o tamanho como quiser.
      </p>
      <Button variant="outline" className="mt-6" onClick={fecharJanelaFlutuante}>
        Trazer de volta para cá
      </Button>
    </motion.div>
  )
}
