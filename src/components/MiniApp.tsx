import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ClipboardPaste, PanelTopClose, Plus } from 'lucide-react'
import { analisar } from '../lib/analyze'
import { focarQuandoExistir } from '../lib/actions'
import { fecharJanelaFlutuante } from '../lib/pip'
import { useCurrent, useNotes } from '../store/notes'
import { useUi } from '../store/ui'
import { CopyButton } from './CopyButton'
import { Etapas } from './Etapas'
import { FaixaAnexos } from './Anexos'
import { SidePanel } from './SidePanel'
import { SituacaoBar } from './SituacaoBar'
import { Button, IconButton, cx } from './ui'

/** Versão compacta para a janela flutuante: escolhe a anotação, edita a etapa aberta e copia. */
export function MiniApp() {
  const n = useCurrent()
  const notes = useNotes((s) => s.notes)
  const abertas = useMemo(() => [...notes].filter((x) => !x.excluidaEm).sort((a, b) => b.updatedAt - a.updatedAt), [notes])
  const issues = useMemo(() => (n ? analisar(n) : []), [n])
  const bloqueado = issues.some((i) => i.level === 'block')
  const pend = issues.filter((i) => i.level !== 'info').length
  const aba = useUi((s) => s.miniAba)
  const setAba = useUi((s) => s.setMiniAba)

  const nova = () => {
    useNotes.getState().criar()
    setAba('etapas')
    focarQuandoExistir('f-cnpj')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-surface px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1.5">
          {/* Trocar de anotação sem sair da janelinha */}
          <div className="relative min-w-0 flex-1">
            <select
              aria-label="Anotação aberta"
              value={n && !n.excluidaEm ? n.id : ''}
              onChange={(e) => useNotes.getState().abrir(e.target.value)}
              className="h-9 w-full cursor-pointer appearance-none truncate rounded-md border border-line bg-surface pr-8 pl-3 text-[13.5px] font-semibold text-fg outline-none focus:border-primary"
            >
              {!n || n.excluidaEm ? <option value="">Escolha uma anotação</option> : null}
              {abertas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.razaoSocial.trim() || 'Sem razão social'}
                  {x.proposta.trim() ? ` · ${x.proposta.trim()}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-3" />
          </div>
          <IconButton label="Nova anotação (Alt + N)" onClick={nova}>
            <Plus />
          </IconButton>
          <IconButton label="Voltar para a aba do navegador" onClick={fecharJanelaFlutuante}>
            <PanelTopClose />
          </IconButton>
        </div>

        {n && (
          <div className="mt-2 flex items-center gap-1">
            {(['etapas', 'resumo'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAba(k)}
                className={cx(
                  'relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors',
                  aba === k ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
                )}
              >
                {aba === k && <motion.span layoutId="mini-aba" className="absolute inset-0 -z-0 rounded-lg bg-surface shadow-card ring-1 ring-line dark:bg-surface-3" />}
                <span className="relative flex items-center gap-1.5">
                  {k === 'etapas' ? 'Etapas' : 'Pendências e texto'}
                  {k === 'resumo' && pend > 0 && (
                    <span className={cx('rounded-full px-1.5 text-[10.5px] font-semibold', bloqueado ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>{pend}</span>
                  )}
                </span>
              </button>
            ))}
            <div className="ml-auto">
              <CopyButton bloqueado={bloqueado} label="Copiar" size="sm" />
            </div>
          </div>
        )}
      </header>

      <main className="grid flex-1 content-start gap-3 px-3 pt-3 pb-8">
        {n && !n.excluidaEm ? (
          <>
            <FaixaAnexos compacta />
            {aba === 'etapas' ? (
              <>
                <SituacaoBar n={n} />
                <Etapas n={n} issues={issues} />
              </>
            ) : (
              <SidePanel n={n} issues={issues} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <p className="text-[14px] font-semibold">Nenhuma anotação aberta</p>
            <p className="mt-1 text-[13px] text-fg-2">Crie uma nova ou escolha uma na lista acima.</p>
            <Button variant="primary" className="mt-4" onClick={nova}>
              <Plus /> Nova anotação
            </Button>
          </div>
        )}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-fg-3">
          <ClipboardPaste className="size-3.5" /> Copiou algo? Clique aqui e aperte Ctrl+V
        </p>
      </main>
    </div>
  )
}
