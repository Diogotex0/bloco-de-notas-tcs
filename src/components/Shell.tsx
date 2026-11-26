import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, ClipboardCheck, CopyPlus, Maximize2, Minimize2, PictureInPicture2, Info, Menu, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
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
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-[60px] max-w-[1360px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <IconButton label="Abrir menu" className={cx('lg:hidden', foco && 'hidden')} onClick={() => setNav(true)}>
          <Menu />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div>
              <h1 className="truncate text-[15px] font-semibold">
                {n ? n.razaoSocial.trim() || 'Nova anotação' : 'Bloco de Poderes'}
              </h1>
              <p className="truncate text-[12.5px] text-fg-2 tabular-nums">
                {n
                  ? [n.proposta.trim() && `Proposta ${n.proposta.trim()}`, n.cnpj].filter(Boolean).join(' · ') || 'Preencha os dados da proposta'
                  : 'Anotações da análise de poderes'}
              </p>
          </div>
        </div>

        {n && (
          <>
            <span
              className={cx(
                'mr-2 hidden items-center gap-1.5 text-[12px] md:inline-flex',
                !available || error ? 'font-medium text-bad' : 'text-fg-3',
              )}
              title={!available || error ? 'O navegador está bloqueando o armazenamento. Exporte um backup.' : 'Salvo automaticamente neste navegador'}
            >
              {!available || error ? (
                <>
                  <CircleAlert className="size-3.5" /> Não está salvando
                </>
              ) : (
                <span key={savedAt}>Salvo</span>
              )}
            </span>
            <IconButton
              label={foco ? 'Sair do modo foco (Alt + M)' : 'Modo foco: só a etapa atual (Alt + M)'}
              onClick={alternarFoco}
              className={cx(foco && 'bg-surface-3 text-fg')}
            >
              {foco ? <Minimize2 /> : <Maximize2 />}
            </IconButton>
            <Button variant="outline" size="sm" onClick={abrirRevisao} title="Ver tudo o que foi preenchido antes de finalizar" className="max-md:hidden">
              <ClipboardCheck /> Revisar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void abrirJanelaFlutuante()} title="Abre o bloco numa janelinha que fica por cima das outras janelas" className="max-md:hidden">
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
            <div className="ml-1 hidden sm:block">
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
    <div className="mx-auto max-w-xl px-6 py-20 sm:px-8">
      <h2 className="text-[22px] font-semibold">Nenhuma anotação aberta</h2>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-fg-2">
        Crie uma anotação para começar a análise. Tudo fica salvo neste navegador; nada é enviado para a internet.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
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
          Ver um exemplo
        </Button>
      </div>
      <dl className="mt-10 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-4 text-[12.5px]">
        <dt className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>N</Kbd></dt>
        <dd className="text-fg-2">Nova anotação</dd>
        <dt className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>C</Kbd></dt>
        <dd className="text-fg-2">Copiar o texto final</dd>
        <dt className="flex items-center gap-1"><Kbd>Ctrl</Kbd>+<Kbd>K</Kbd></dt>
        <dd className="text-fg-2">Buscar anotação</dd>
      </dl>
    </div>
  )
}

/* ---------- Notificações ---------- */
const toastIcon = { success: CircleCheck, info: Info, warn: TriangleAlert, danger: CircleAlert }
const toastColor = { success: 'text-[#6fd39a] dark:text-ok', info: 'text-toast-fg/70', warn: 'text-[#e8b864] dark:text-warn', danger: 'text-[#f38d94] dark:text-bad' }

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
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      role="status"
      className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-md bg-toast py-2.5 pr-2 pl-3.5 text-[13.5px] text-toast-fg shadow-pop"
    >
      <Ic className={cx('size-4 shrink-0', toastColor[t.type])} />
      <span className="min-w-0 flex-1 leading-snug">{t.msg}</span>
      {t.action && (
        <button
          className="rounded-sm px-2.5 py-1.5 text-[13px] font-semibold text-toast-fg underline underline-offset-2 transition-colors hover:bg-white/10 dark:hover:bg-black/5"
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
