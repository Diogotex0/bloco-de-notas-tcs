import { ArchiveRestore, Trash2 } from 'lucide-react'
import type { Note, Situacao } from '../lib/types'
import { excluirDeVez } from '../lib/actions'
import { diasRestantesLixeira, useNotes } from '../store/notes'
import { useUi } from '../store/ui'
import { toast } from '../store/toast'
import { pedirConferencia } from '../store/anexos'
import { anexosPendentes } from '../lib/anexos'
import { Button, Segmented } from './ui'

const NOMES: Record<Situacao, string> = {
  analise: 'Em análise',
  aguardando: 'Em aguardo',
  finalizada: 'Finalizada',
}

/** Situação da anotação, ou aviso de lixeira quando ela foi excluída. */
export function SituacaoBar({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)

  if (n.excluidaEm) {
    const dias = diasRestantesLixeira(n)
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-bad-line bg-bad-soft p-4 sm:flex-row sm:items-center">
        <Trash2 className="size-5 shrink-0 text-bad" />
        <div className="min-w-0 flex-1 text-[13.5px]">
          <p className="font-semibold text-fg">Esta anotação está na lixeira</p>
          <p className="text-fg-2">
            Será apagada para sempre em {dias} {dias === 1 ? 'dia' : 'dias'}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-bad hover:bg-bad/10" onClick={() => void excluirDeVez(n.id)}>
            Excluir de vez
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              useNotes.getState().tirarDaLixeira(n.id)
              useUi.getState().setFiltro(n.situacao === 'finalizada' ? 'finalizadas' : 'abertas')
              toast('Anotação restaurada', { type: 'success' })
            }}
          >
            <ArchiveRestore /> Restaurar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
      <span className="text-[12.5px] font-medium text-fg-3">Situação</span>
      <Segmented
        size="sm"
        ariaLabel="Situação da anotação"
        value={n.situacao}
        onChange={(v) => {
          if (!v || v === n.situacao) return
          // Ao finalizar, confere os anexos primeiro.
          if (v === 'finalizada' && anexosPendentes(n).length) {
            pedirConferencia('finalizar')
            return
          }
          editar((d) => void (d.situacao = v))
          if (v === 'finalizada') toast('Anotação finalizada. Ela fica na aba “Finalizadas”.', { type: 'success' })
        }}
        options={[
          { value: 'analise' as const, label: NOMES.analise },
          { value: 'aguardando' as const, label: NOMES.aguardando, tone: 'warn' },
          { value: 'finalizada' as const, label: NOMES.finalizada, tone: 'ok' },
        ]}
      />
    </div>
  )
}
