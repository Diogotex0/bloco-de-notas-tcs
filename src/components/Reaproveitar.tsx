import { motion } from 'motion/react'
import type { Note } from '../lib/types'
import { cnpjClean } from '../lib/cnpj'
import { fmtDate } from '../lib/dates'
import { reaproveitar } from '../lib/actions'
import { useNotes } from '../store/notes'
import { Button, Reveal } from './ui'

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

/** Só oferece quando a anotação atual ainda não tem grupos, documentos nem filiais (para não sobrescrever nada). */
const semDados = (n: Note) => !n.grupos.length && !n.docsRecebidos.length && !n.docsApoio.length && !n.filiais.length
const temDados = (n: Note) => n.grupos.length + n.docsRecebidos.length + n.docsApoio.length + n.filiais.length > 0

export function Reaproveitar({ n }: { n: Note }) {
  const notes = useNotes((s) => s.notes)
  const editar = useNotes((s) => s.editar)
  const c = cnpjClean(n.cnpj)

  const anterior =
    c.length === 14 && !n.reaproveitar && semDados(n)
      ? notes
          .filter((x) => x.id !== n.id && !x.excluidaEm && cnpjClean(x.cnpj) === c && temDados(x))
          .sort((a, b) => b.updatedAt - a.updatedAt)[0]
      : undefined

  const partes = anterior
    ? [
        anterior.grupos.length && pl(anterior.grupos.length, 'grupo', 'grupos'),
        anterior.docsRecebidos.length + anterior.docsApoio.length &&
          pl(anterior.docsRecebidos.length + anterior.docsApoio.length, 'documento', 'documentos'),
        anterior.filiais.length && pl(anterior.filiais.length, 'filial', 'filiais'),
      ].filter(Boolean)
    : []

  return (
    <Reveal show={!!anterior}>
      {anterior && (
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary-soft p-3.5 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
            <p className="font-semibold text-fg">Este CNPJ já tem uma análise anterior</p>
            <p className="text-fg-2">
              Proposta {anterior.proposta.trim() || 'sem número'} · {fmtDate(new Date(anterior.updatedAt))}
              {partes.length > 0 && ` · ${partes.join(', ')}`}. Quer copiar grupos, documentos e filiais?
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => editar((d) => void (d.reaproveitar = 'ignorado'))}>
              Não, obrigado
            </Button>
            <Button size="sm" variant="primary" onClick={() => reaproveitar(anterior)}>
              Copiar dados
            </Button>
          </div>
        </motion.div>
      )}
    </Reveal>
  )
}
