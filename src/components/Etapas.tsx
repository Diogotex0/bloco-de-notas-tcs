import type { ReactNode } from 'react'
import type { Note, SectionKey } from '../lib/types'
import type { Issue } from '../lib/analyze'
import { temConteudo } from '../lib/analyze'
import { SECTIONS } from '../lib/defaults'
import { resumoEtapa } from '../lib/summary'
import { Section } from './Section'
import { Proposta } from './sections/Proposta'
import { Grupos } from './sections/Grupos'
import { Documentos } from './sections/Documentos'
import { Anotacoes, Garantidor, Outorga } from './sections/Simples'
import { Filiais } from './sections/Filiais'
import { Assinaturas } from './sections/Assinaturas'

const CONTEUDO: Record<SectionKey, (p: { n: Note }) => ReactNode> = {
  proposta: Proposta,
  grupos: Grupos,
  docs: Documentos,
  outorga: Outorga,
  garantidor: Garantidor,
  filiais: Filiais,
  assinaturas: Assinaturas,
  anotacoes: Anotacoes,
}

/** As 8 etapas da anotação. Usado na aba e na janela flutuante. */
export function Etapas({ n, issues }: { n: Note; issues: Issue[] }) {
  return (
    <>
      {SECTIONS.map((s, i) => {
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
          >
            <Conteudo n={n} />
          </Section>
        )
      })}
    </>
  )
}
