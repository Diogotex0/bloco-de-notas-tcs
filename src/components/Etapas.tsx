import type { ReactNode } from 'react'
import type { Note, SectionKey } from '../lib/types'
import type { Issue } from '../lib/analyze'
import { temConteudo } from '../lib/analyze'
import { SECTIONS } from '../lib/defaults'
import { resumoEtapa } from '../lib/summary'
import { Section } from './Section'
import { useNotes } from '../store/notes'
import { Proposta } from './sections/Proposta'
import { Grupos } from './sections/Grupos'
import { Documentos } from './sections/Documentos'
import { Anotacoes, Garantidor } from './sections/Simples'
import { Filiais } from './sections/Filiais'

const CONTEUDO: Record<SectionKey, (p: { n: Note }) => ReactNode> = {
  proposta: Proposta,
  grupos: Grupos,
  docs: Documentos,
  garantidor: Garantidor,
  filiais: Filiais,
  anotacoes: Anotacoes,
}

/** As etapas da anotação. Usado na aba e na janela flutuante. */
export function Etapas({ n, issues, somente }: { n: Note; issues: Issue[]; somente?: SectionKey }) {
  return (
    <div className="rounded-md border border-line bg-surface">
      {SECTIONS.map((s, i) => {
        if (somente && s.key !== somente) return null
        const Conteudo = CONTEUDO[s.key]
        return (
          <Section
            key={s.key}
            k={s.key}
            index={i + 1}
            title={s.title}
            desc={s.desc}
            optional={s.optional}
            summary={resumoEtapa(n, s.key)}
            issues={issues.filter((x) => x.sec === s.key && x.level !== 'info')}
            hasContent={temConteudo(n, s.key)}
            next={SECTIONS[i + 1] && { key: SECTIONS[i + 1].key, title: SECTIONS[i + 1].title }}
            nota={n.notasEtapa[s.key] ?? ''}
            onNota={(v) =>
              useNotes.getState().editar((d) => {
                if (v) d.notasEtapa[s.key] = v
                else delete d.notasEtapa[s.key]
              })
            }
          >
            <Conteudo n={n} />
          </Section>
        )
      })}
    </div>
  )
}
