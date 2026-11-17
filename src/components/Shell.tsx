import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, ClipboardCheck, CopyPlus, Maximize2, Minimize2, PictureInPicture2, Info, Menu, NotebookPen, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react'
import type { Note } from '../lib/types'
import { excluirDeVez, excluirNota, focarQuandoExistir } from '../lib/actions'
import { abrirJanelaFlutuante } from '../lib/pip'
import { abrirRevisao } from '../lib/revisao'
import { useNotes, useSaveStatus } from '../store/notes'
import { useUi } from '../store/ui'
import { useToasts, type Toast } from '../store/toast'
import { CopyButton } from './CopyButton'
import { Button, IconButton, Kbd, cx } from './ui'

/* ---------- Barra superior ---------- */
export function Topbar({ n, bloqueado }: { n: Note | null; bloqueado: boolean }) {
  const setNav = useUi((s) => s.setNav)
  const { error, available, savedAt } = useSaveStatus()
  const duplicar = useNotes((s) => s.duplicar)
  const foco = useUi((s) => s.foco)
  const alternarFoco = useUi((s) => s.alternarFoco)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <IconButton label="Abrir menu" className={cx('lg:hidden', foco && 'hidden')} onClick={() => setNav(true)}>
          <Menu />
        </IconButton>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={n?.id ?? 'vazio'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              <h1 className="truncate text-[16.5px] font-semibold tracking-[-0.015em]">
                {n ? n.razaoSocial.trim() || 'Nova anotação' : 'Bloco de Poderes'}
              </h1>
              <p className="truncate text-[12.5px] text-fg-3 tabular-nums">
                {n
                  ? [n.proposta.trim() && `Proposta ${n.proposta.trim()}`, n.cnpj].filter(Boolean).join(' · ') || 'Preencha os dados da proposta'
                  : 'Anotações da análise de poderes'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {n && (
          <>
            <span
              className={cx(
                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium md:inline-flex',
                !available || error ? 'bg-bad-soft text-bad' : 'text-fg-3',
              )}
              title={!available || error ? 'O navegador está bloqueando o armazenamento. Exporte um backup.' : 'Salvo automaticamente neste navegador'}
            >
              {!available || error ? (
                <>
                  <CircleAlert className="size-3.5" /> Não está salvando
                </>
              ) : (
                <>
                  <motion.span key={savedAt} className="size-1.5 rounded-full bg-ok" initial={{ scale: 2.2, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} />
                  Salvo
                </>
              )}
            </span>
            <IconButton
              label={foco ? 'Sair do modo foco (Alt + M)' : 'Modo foco: só a etapa atual (Alt + M)'}
              onClick={alternarFoco}
              className={cx(foco && 'bg-primary-soft text-primary-ink hover:bg-primary-soft-hover hover:text-primary-ink')}
            >
              {foco ? <Minimize2 /> : <Maximize2 />}
            </IconButton>
            <Button variant="outline" size="sm" onClick={abrirRevisao} title="Ver tudo o que foi preenchido antes de finalizar" className="hidden md:inline-flex">
              <ClipboardCheck /> Revisar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void abrirJanelaFlutuante()} title="Abre o bloco numa janelinha que fica por cima das outras janelas" className="hidden md:inline-flex">
              <PictureInPicture2 /> Destacar
            </Button>
            <IconButton label="Duplicar anotação" onClick={duplicar}>
              <CopyPlus />
            </IconButton>
            <IconButton
              label={n.excluidaEm ? 'Excluir de vez' : 'Mover para a lixeira'}
              tone="danger"
              onClick={() => (n.excluidaEm ? void excluirDeVez(n.id) : excluirNota(n.id))}
            >
              <Trash2 />
            </IconButton>
            <div className="hidden sm:block">
              <CopyButton bloqueado={bloqueado} />
            </div>
          </>
        )}
      </div>
    </header>
  )
}

/* ---------- Estado vazio ---------- */
export function EmptyState() {
  const { criar, exemplo } = useNotes.getState()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center"
    >
      <div className="relative mb-6">
        <motion.div
          className="absolute -inset-6 rounded-full bg-primary/15 blur-2xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#6b75ff] to-[#4350f0] text-white shadow-[0_10px_30px_-8px_rgb(79_91_255/0.6)]">
          <NotebookPen className="size-7" />
        </div>
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Nenhuma anotação aberta</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-2">
        Crie uma anotação para começar a análise. Tudo é salvo automaticamente neste navegador, sem enviar nada para a internet.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          onClick={() => {
            criar()
            focarQuandoExistir('f-cnpj')
          }}
        >
          <Plus /> Nova anotação
        </Button>
        <Button variant="outline" onClick={exemplo}>
          <Sparkles /> Ver um exemplo
        </Button>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-fg-3">
        <span className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>N</Kbd> nova</span>
        <span className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>C</Kbd> copiar</span>
        <span className="flex items-center gap-1"><Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> buscar</span>
      </div>
    </motion.div>
  )
}

/* ---------- Notificações ---------- */
const toastIcon = { success: CircleCheck, info: Info, warn: TriangleAlert, danger: CircleAlert }
const toastColor = { success: 'text-ok', info: 'text-primary-ink', warn: 'text-warn', danger: 'text-bad' }

export function Toaster() {
  const list = useToasts((s) => s.list)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss)
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.duration)
    return () => window.clearTimeout(id)
  }, [t, dismiss])
  const Ic = toastIcon[t.type]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role="status"
      className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-xl bg-toast py-2.5 pr-2 pl-3.5 text-[13.5px] text-toast-fg shadow-pop"
    >
      <Ic className={cx('size-[17px] shrink-0', toastColor[t.type], 'brightness-125 dark:brightness-90')} />
      <span className="min-w-0 flex-1 leading-snug">{t.msg}</span>
      {t.action && (
        <button
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#9fa7ff] transition-colors hover:bg-white/10 dark:text-primary dark:hover:bg-black/5"
          onClick={() => {
            t.action!.run()
            dismiss(t.id)
          }}
        >
          {t.action.label}
        </button>
      )}
      <button className="grid size-7 place-items-center rounded-lg opacity-60 transition hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/5" onClick={() => dismiss(t.id)} aria-label="Fechar">
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}
