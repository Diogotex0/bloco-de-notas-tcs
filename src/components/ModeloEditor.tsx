import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronDown, Download, FileText, GripVertical, RotateCcw, Space, Upload, X } from 'lucide-react'
import { CATALOGO, type Bloco, type Modelo, modeloPadrao, normalizarModelo } from '../lib/modelo'
import { gerarTexto } from '../lib/generate'
import { notaExemplo } from '../lib/example'
import { janela } from '../lib/janela'
import { salvarModelo, useModelo } from '../store/modelo'
import { useCurrent } from '../store/notes'
import { toast } from '../store/toast'
import { Button, Checkbox, IconButton, TextArea, TextInput, cx } from './ui'

/** Tela para o analista mudar a ordem, os rótulos e as frases do texto final. */
export function ModeloEditor() {
  const aberto = useModelo((s) => s.editorAberto)
  const salvo = useModelo((s) => s.modelo)
  const atual = useCurrent()
  const [rascunho, setRascunho] = useState<Modelo>(salvo)
  const [expandido, setExpandido] = useState<string | null>(null)
  const exemplo = useRef(notaExemplo())
  const arquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) return
    setRascunho(salvo)
    setExpandido(null)
    const w = janela()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const fechar = () => useModelo.setState({ editorAberto: false })
  const mudou = JSON.stringify(rascunho) !== JSON.stringify(salvo)
  const nota = atual && !atual.excluidaEm ? atual : exemplo.current

  const setBloco = (chave: Bloco['chave'], fn: (b: Bloco) => Bloco) =>
    setRascunho((m) => ({ ...m, blocos: m.blocos.map((b) => (b.chave === chave ? fn(b) : b)) }))
  const mover = (i: number, d: -1 | 1) =>
    setRascunho((m) => {
      const j = i + d
      if (j < 0 || j >= m.blocos.length) return m
      const blocos = [...m.blocos]
      ;[blocos[i], blocos[j]] = [blocos[j], blocos[i]]
      return { ...m, blocos }
    })

  const salvar = () => {
    salvarModelo(rascunho)
    toast('Modelo do texto salvo', { type: 'success' })
    fechar()
  }

  const exportar = () => {
    const blob = new Blob([JSON.stringify(rascunho, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-do-texto.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('Modelo exportado. Mande o arquivo para o time importar.', { type: 'success' })
  }

  const importar = async (f: File) => {
    try {
      if (f.size > 1024 * 1024) throw new Error('grande')
      setRascunho(normalizarModelo(JSON.parse(await f.text())))
      toast('Modelo carregado. Confira a prévia e clique em Salvar.', { type: 'info' })
    } catch {
      toast('Arquivo inválido. Use um modelo exportado por este bloco.', { type: 'danger' })
    }
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-[66] grid place-items-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fechar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modelo-titulo"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="modelo-titulo" className="text-[16px] font-semibold">
                  Modelo do texto
                </h2>
                <p className="text-[12.5px] text-fg-3">Arraste para mudar a ordem, desmarque o que não quer e troque os rótulos.</p>
              </div>
              <IconButton label="Fechar" onClick={fechar}>
                <X />
              </IconButton>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:overflow-hidden">
              {/* Blocos */}
              <div className="min-h-0 overflow-x-hidden p-4 lg:overflow-y-auto lg:border-r lg:border-line">
                <Reorder.Group axis="y" values={rascunho.blocos} onReorder={(blocos) => setRascunho((m) => ({ ...m, blocos }))} className="grid gap-1.5">
                  {rascunho.blocos.map((b, i) => (
                    <LinhaBloco
                      key={b.chave}
                      b={b}
                      i={i}
                      total={rascunho.blocos.length}
                      expandido={expandido === b.chave}
                      onExpandir={() => setExpandido((x) => (x === b.chave ? null : b.chave))}
                      onMudar={(fn) => setBloco(b.chave, fn)}
                      onMover={(d) => mover(i, d)}
                    />
                  ))}
                </Reorder.Group>
              </div>

              {/* Prévia */}
              <div className="flex min-h-0 flex-col p-4">
                <h3 className="mb-1 text-[12px] font-semibold tracking-wide text-fg-3 uppercase">Prévia</h3>
                <p className="mb-2.5 text-[12px] text-fg-3">
                  {nota === exemplo.current ? 'Usando o exemplo fictício' : `Usando a anotação aberta: ${nota.razaoSocial.trim() || 'sem razão social'}`}
                </p>
                <pre className="min-h-[220px] flex-1 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[12.25px] leading-[1.7] break-words whitespace-pre-wrap text-fg">
                  {gerarTexto(nota, rascunho) || '(nenhum bloco ativo)'}
                </pre>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3.5">
              <Button variant="ghost" size="sm" onClick={() => setRascunho(modeloPadrao())} title="Volta ao modelo original">
                <RotateCcw /> Restaurar padrão
              </Button>
              <Button variant="ghost" size="sm" onClick={exportar} title="Salva o modelo num arquivo para compartilhar com o time">
                <Download /> Exportar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => arquivo.current?.click()} title="Carrega um modelo recebido de um colega">
                <Upload /> Importar
              </Button>
              <input
                ref={arquivo}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void importar(f)
                }}
              />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={fechar}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={salvar} disabled={!mudou}>
                  Salvar modelo
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LinhaBloco({
  b,
  i,
  total,
  expandido,
  onExpandir,
  onMudar,
  onMover,
}: {
  b: Bloco
  i: number
  total: number
  expandido: boolean
  onExpandir: () => void
  onMudar: (fn: (b: Bloco) => Bloco) => void
  onMover: (d: -1 | 1) => void
}) {
  const cat = CATALOGO[b.chave]
  const controles = useDragControls()
  return (
    <Reorder.Item
      value={b}
      dragListener={false}
      dragControls={controles}
      className={cx('rounded-xl border bg-surface transition-colors', b.ativo ? 'border-line' : 'border-dashed border-line bg-surface-2 opacity-70')}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px -10px rgb(0 0 0 / 0.3)', zIndex: 10 }}
    >
      {b.espacoAntes && i > 0 && <div className="-mt-px h-0 border-t-2 border-dotted border-primary/30" title="Linha em branco antes" />}
      <div className="flex items-center gap-1 py-1 pr-1.5 pl-1">
        <button
          type="button"
          aria-label="Arrastar para mudar a ordem"
          title="Arraste para mudar a ordem"
          onPointerDown={(e) => controles.start(e)}
          className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-fg-3 hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <Checkbox checked={b.ativo} onChange={(v) => onMudar((x) => ({ ...x, ativo: v }))} ariaLabel={`Mostrar ${cat.nome}`} className="min-h-8" />
        <button type="button" onClick={onExpandir} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-fg">{cat.nome}</span>
            {cat.dica && <span className="block truncate text-[11.5px] text-fg-3">{cat.dica}</span>}
          </span>
          <ChevronDown className={cx('size-4 shrink-0 text-fg-3 transition-transform', !expandido && '-rotate-90')} />
        </button>
        <IconButton
          label={b.espacoAntes ? 'Tirar a linha em branco antes' : 'Pôr uma linha em branco antes'}
          onClick={() => onMudar((x) => ({ ...x, espacoAntes: !x.espacoAntes }))}
          className={cx('size-8', b.espacoAntes && 'bg-primary-soft text-primary-ink')}
        >
          <Space />
        </IconButton>
        <IconButton label="Subir" disabled={i === 0} onClick={() => onMover(-1)} className="size-8 disabled:opacity-30">
          <ArrowUp />
        </IconButton>
        <IconButton label="Descer" disabled={i === total - 1} onClick={() => onMover(1)} className="size-8 disabled:opacity-30">
          <ArrowDown />
        </IconButton>
      </div>
      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="grid gap-2.5 border-t border-line px-3 pt-2.5 pb-3">
              {cat.rotulos.map((r) => (
                <label key={r.id} className="grid gap-1">
                  <span className="text-[12px] font-medium text-fg-2">{r.nome}</span>
                  {r.longo ? (
                    <TextArea
                      value={b.rotulos[r.id] ?? ''}
                      onChange={(e) => onMudar((x) => ({ ...x, rotulos: { ...x.rotulos, [r.id]: e.target.value } }))}
                      className="min-h-[64px] text-[13px]"
                    />
                  ) : (
                    <TextInput
                      value={b.rotulos[r.id] ?? ''}
                      placeholder={r.padrao}
                      onChange={(e) => onMudar((x) => ({ ...x, rotulos: { ...x.rotulos, [r.id]: e.target.value } }))}
                      className="h-9 text-[13px]"
                    />
                  )}
                </label>
              ))}
              {b.chave === 'garantidor' && (
                <p className="text-[11.5px] text-fg-3">
                  <code className="rounded bg-surface-3 px-1">{'{é/não é}'}</code> vira “é” ou “não é”, e <code className="rounded bg-surface-3 px-1">{'{data}'}</code> vira a data da base.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}
