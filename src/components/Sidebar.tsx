import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, BellOff, BellRing, Download, FileText, Settings2, Moon, Plus, Search, Sun, Upload, X } from 'lucide-react'
import type { Note } from '../lib/types'
import { analisar, statusDe, type NoteStatus } from '../lib/analyze'
import { notaVazia } from '../lib/defaults'
import { cnpjClean } from '../lib/cnpj'
import { relTime } from '../lib/dates'
import { esvaziarLixeira, exportarBackup, focarQuandoExistir, importarBackup } from '../lib/actions'
import { diasRestantesLixeira, useNotes } from '../store/notes'
import { useUi, type Filtro } from '../store/ui'
import { janela } from '../lib/janela'
import { alternarLembrete, useLembrete } from '../lib/lembrete'
import { abrirEditorModelo } from '../store/modelo'
import { Button, IconButton, Kbd, cx } from './ui'

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const dot: Record<NoteStatus, string> = {
  empty: 'bg-line-strong',
  ok: 'bg-ok',
  warn: 'bg-warn',
  block: 'bg-bad',
}
const dotLabel: Record<NoteStatus, string> = {
  empty: 'Em branco',
  ok: 'Completa',
  warn: 'Com pendências',
  block: 'Bloqueada: validação pendente',
}

const aba = (n: Note): Filtro => (n.excluidaEm ? 'lixeira' : n.situacao === 'finalizada' ? 'finalizadas' : 'abertas')
const naAba = (n: Note, f: Filtro) => aba(n) === f

const ABAS: { k: Filtro; label: string }[] = [
  { k: 'abertas', label: 'Abertas' },
  { k: 'finalizadas', label: 'Finalizadas' },
  { k: 'lixeira', label: 'Lixeira' },
]

const VAZIO: Record<Filtro, React.ReactNode> = {
  abertas: (
    <>
      Nenhuma anotação em aberto.
      <br />
      Comece pelo botão acima.
    </>
  ),
  finalizadas: 'Nenhuma anotação finalizada ainda.',
  lixeira: (
    <span className="inline-flex flex-col items-center gap-2">
      <Archive className="size-5" />A lixeira está vazia.
    </span>
  ),
}

export function Sidebar() {
  const notes = useNotes((s) => s.notes)
  const currentId = useNotes((s) => s.currentId)
  const { criar, abrir, exemplo } = useNotes.getState()
  const navOpen = useUi((s) => s.navOpen)
  const setNav = useUi((s) => s.setNav)
  const theme = useUi((s) => s.theme)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const filtro = useUi((s) => s.filtro)
  const lembrete = useLembrete((s) => s.ativo)
  const setFiltro = useUi((s) => s.setFiltro)
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const lista = useMemo(() => {
    const termo = semAcento(q.trim())
    const digitos = cnpjClean(q)
    return [...notes]
      .sort((a, b) => (filtro === 'lixeira' ? b.excluidaEm - a.excluidaEm : b.updatedAt - a.updatedAt))
      .filter((n) => naAba(n, filtro))
      .filter((n) => {
        if (!termo) return true
        return (
          semAcento(`${n.razaoSocial} ${n.proposta} ${n.cnpj}`).includes(termo) ||
          (digitos.length >= 3 && cnpjClean(n.cnpj).includes(digitos))
        )
      })
  }, [notes, q, filtro])

  const contagem = { abertas: 0, finalizadas: 0, lixeira: 0 }
  notes.forEach((n) => contagem[aba(n)]++)

  const abrirNota = (id: string) => {
    abrir(id)
    setNav(false)
    janela().scrollTo({ top: 0 })
  }

  return (
    <>
      <AnimatePresence>
        {navOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNav(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col gap-3.5 border-r border-line bg-surface px-3.5 pt-4 pb-3 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-0 lg:h-dvh lg:translate-x-0',
          navOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
        )}
      >
        {/* Marca */}
        <div className="flex items-center gap-3 px-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-tight font-semibold">Bloco de Poderes</p>
            <p className="text-[12px] text-fg-3">Análise de poderes PJ</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg text-fg-3 hover:bg-surface-3 lg:hidden" onClick={() => setNav(false)} aria-label="Fechar menu">
            <X className="size-4" />
          </button>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            criar()
            setNav(false)
            focarQuandoExistir('f-cnpj')
          }}
        >
          <Plus /> Nova anotação
          <span className="ml-auto hidden font-mono text-[11px] opacity-70 sm:inline">Alt+N</span>
        </Button>

        {/* Busca */}
        <label className="group flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Search className="size-4 shrink-0 text-fg-3" />
          <input
            id="busca"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && lista[0]) abrirNota(lista[0].id)
              if (e.key === 'Escape') setQ('')
            }}
            placeholder="Buscar CNPJ, proposta ou nome"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-3 [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button onClick={() => setQ('')} className="text-fg-3 hover:text-fg" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          ) : (
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </label>

        {/* Filtro: em aberto, finalizadas e lixeira */}
        <div className="-mx-3.5 flex gap-4 border-b border-line px-5" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.k}
              role="tab"
              aria-selected={filtro === a.k}
              onClick={() => setFiltro(a.k)}
              className={cx(
                '-mb-px flex h-9 items-center gap-1.5 border-b-2 text-[12.5px] font-medium transition-colors',
                filtro === a.k ? 'border-fg text-fg' : 'border-transparent text-fg-3 hover:text-fg-2',
              )}
            >
              <span className="relative flex items-center gap-1">
                {a.label}
                {contagem[a.k] > 0 && <span className="text-[11px] text-fg-3 tabular-nums">{contagem[a.k]}</span>}
              </span>
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtro === 'lixeira' && contagem.lixeira > 0 && (
          <div className="-mt-1 flex items-center justify-between gap-2 px-1.5 text-[12px] text-fg-3">
            <span>Apagadas sozinhas após 30 dias</span>
            <button onClick={() => void esvaziarLixeira()} className="font-medium text-bad hover:underline">
              Esvaziar
            </button>
          </div>
        )}
        <nav className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="relative grid gap-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {lista.map((n) => (
                <ItemNota key={n.id} n={n} ativo={n.id === currentId} onClick={() => abrirNota(n.id)} />
              ))}
            </AnimatePresence>
          </div>
          {!lista.length && (
            <div className="px-3 py-8 text-center text-[13px] text-fg-3">
              {q ? <>Nada encontrado para “{q}”.</> : VAZIO[filtro]}
            </div>
          )}
        </nav>

        {/* Rodapé */}
        <div className="grid gap-1 border-t border-line pt-3">
          <RodapeBtn
            icon={<FileText />}
            onClick={() => {
              exemplo()
              setNav(false)
            }}
          >
            Carregar exemplo
          </RodapeBtn>
          <div className="flex items-center gap-1">
            <IconButton label="Modelo do texto (ordem, rótulos e frases)" onClick={abrirEditorModelo}>
              <Settings2 />
            </IconButton>
            <IconButton label="Exportar backup (salva todas as anotações num arquivo)" onClick={exportarBackup}>
              <Download />
            </IconButton>
            <IconButton label="Importar backup" onClick={() => fileRef.current?.click()}>
              <Upload />
            </IconButton>
            <IconButton
              label={lembrete ? 'Lembrete de anexos ligado (clique para desligar)' : 'Ligar lembrete de anexos ao sair da tela'}
              onClick={() => void alternarLembrete()}
              className={cx('ml-auto', lembrete && 'text-primary-ink')}
            >
              {lembrete ? <BellRing /> : <BellOff />}
            </IconButton>
            <IconButton label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </IconButton>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void importarBackup(f)
            }}
          />
        </div>
      </aside>
    </>
  )
}

function RodapeBtn({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg [&_svg]:size-4 [&_svg]:text-fg-3"
    >
      {icon}
      {children}
    </button>
  )
}

function ItemNota({ n, ativo, onClick }: { n: Note; ativo: boolean; onClick: () => void }) {
  const status: NoteStatus = notaVazia(n) ? 'empty' : statusDe(analisar(n))
  return (
    <motion.button
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.14 }}
      onClick={onClick}
      aria-current={ativo ? 'true' : undefined}
      className={cx(
        'relative grid w-full grid-cols-[6px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-sm px-3 py-2 text-left transition-colors duration-100',
        ativo ? 'bg-surface-3' : 'hover:bg-surface-2',
      )}
    >
      {ativo && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
      <span className={cx('size-1.5 rounded-full', dot[status])} title={dotLabel[status]} />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-fg">
          {n.razaoSocial.trim() || 'Sem razão social'}
        </span>
        <span className="block truncate text-[12px] text-fg-3 tabular-nums">
          {[n.proposta.trim() && `Prop. ${n.proposta.trim()}`, n.cnpj].filter(Boolean).join(' · ') || 'Em branco'}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1 self-start pt-0.5">
        <span className="text-[11px] whitespace-nowrap text-fg-3">
          {n.excluidaEm ? `apaga em ${diasRestantesLixeira(n)}d` : relTime(n.updatedAt)}
        </span>
        {!n.excluidaEm && n.situacao === 'aguardando' && (
          <span className="text-[11px] font-medium whitespace-nowrap text-warn">Em aguardo</span>
        )}
      </span>
    </motion.button>
  )
}
