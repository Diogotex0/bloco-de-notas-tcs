import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, FileSpreadsheet, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { janela } from '../lib/janela'
import { normalizar } from '../lib/planilha'
import { lacunas, preencher, RE_LACUNA } from '../lib/respostas'
import { copiarTexto } from '../lib/actions'
import { fmtDate } from '../lib/dates'
import { useCurrent } from '../store/notes'
import { toast } from '../store/toast'
import { confirmar } from '../store/confirm'
import { abrirGerenciarPlanilha, carregarPlanilha, removerPlanilha, useReferencia } from '../store/referencia'
import { Button, IconButton, TextInput, cx } from './ui'

/** Moldura comum das janelas desta parte. */
function Janela({ aberta, fechar, titulo, sub, largura, children, rodape }: {
  aberta: boolean
  fechar: () => void
  titulo: string
  sub?: ReactNode
  largura: string
  children: ReactNode
  rodape?: ReactNode
}) {
  useEffect(() => {
    if (!aberta) return
    const w = janela()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
  }, [aberta, fechar])

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          className="fixed inset-0 z-[66] grid place-items-center bg-black/40 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fechar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cx('flex max-h-full w-full flex-col overflow-hidden rounded-md border border-line bg-surface', largura)}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15.5px] font-semibold">{titulo}</h2>
                {sub && <p className="truncate text-[12.5px] text-fg-3">{sub}</p>}
              </div>
              <IconButton label="Fechar" onClick={fechar}>
                <X />
              </IconButton>
            </div>
            {children}
            {rodape && <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">{rodape}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Carregar / trocar a planilha ---------- */
function GerenciarPlanilha() {
  const aberta = useReferencia((s) => s.gerenciar)
  const ref = useReferencia((s) => s.ref)
  const [arrastando, setArrastando] = useState(false)
  const [lendo, setLendo] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const fechar = useMemo(() => () => useReferencia.setState({ gerenciar: false }), [])

  const ler = async (f: File | undefined) => {
    if (!f) return
    setLendo(true)
    await carregarPlanilha(f)
    setLendo(false)
  }

  const itens: [string, number][] = ref
    ? [
        ['respostas prontas', ref.respostas.length],
        ['códigos de autorização', Object.keys(ref.codigos).length],
        ['tipos com quórum', ref.quoruns.length],
        ['links úteis', ref.links.length],
      ]
    : []

  return (
    <Janela
      aberta={aberta}
      fechar={fechar}
      titulo="Planilha de referência"
      sub={ref ? `${ref.versao || ref.arquivo} · carregada em ${fmtDate(new Date(ref.carregadaEm))}` : 'Nenhuma planilha carregada'}
      largura="max-w-lg"
      rodape={
        <>
          {ref && (
            <Button
              variant="danger"
              size="sm"
              className="mr-auto"
              onClick={async () => {
                const ok = await confirmar({
                  titulo: 'Remover a planilha?',
                  texto: 'As respostas prontas, os códigos, os quóruns e os links somem até você carregar de novo. As anotações não mudam.',
                  botao: 'Remover',
                })
                if (ok) {
                  removerPlanilha()
                  toast('Planilha removida deste navegador', { type: 'info' })
                }
              }}
            >
              <Trash2 /> Remover
            </Button>
          )}
          <Button variant="outline" size="sm" className={cx(!ref && 'ml-auto')} onClick={fechar}>
            Fechar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 overflow-y-auto p-5">
        <div className="flex items-start gap-2.5 border-l-2 border-l-ok py-0.5 pl-3 text-[13px] leading-relaxed text-fg-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
          <p>
            A planilha é lida aqui mesmo, no seu navegador. Nada é enviado para a internet, ela não entra no backup das anotações e cada
            pessoa carrega a sua.
          </p>
        </div>

        <button
          type="button"
          disabled={lendo}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            void ler(e.dataTransfer.files[0])
          }}
          className={cx(
            'grid place-items-center gap-1.5 rounded-md border border-dashed px-4 py-7 text-center transition-colors',
            arrastando ? 'border-primary bg-primary-soft' : 'border-line-strong hover:bg-surface-2',
          )}
        >
          <Upload className="size-5 text-fg-3" />
          <span className="text-[13.5px] font-medium text-fg">
            {lendo ? 'Lendo a planilha…' : ref ? 'Trocar pela versão nova' : 'Escolher a planilha (.xlsx)'}
          </span>
          <span className="text-[12px] text-fg-3">ou arraste o arquivo para cá</span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            void ler(f)
          }}
        />

        {ref ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
            {itens.map(([nome, q]) => (
              <div key={nome} className="contents">
                <dt className={cx('text-right font-semibold tabular-nums', q ? 'text-fg' : 'text-warn')}>{q}</dt>
                <dd className="text-fg-2">{nome}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="text-[13px] leading-relaxed text-fg-2">
            <p className="font-medium text-fg">Com a planilha carregada, o bloco passa a mostrar:</p>
            <ul className="mt-1 grid gap-0.5 pl-4 [list-style:disc]">
              <li>respostas prontas de pendência e devolução, já com os dados da anotação;</li>
              <li>o quórum de garantias do tipo societário, na etapa Garantidor;</li>
              <li>os códigos de autorização por extenso nas Anotações (digite A02 e espaço);</li>
              <li>o link da Junta Comercial do estado nos documentos de apoio.</li>
            </ul>
          </div>
        )}
      </div>
    </Janela>
  )
}

/* ---------- Respostas prontas ---------- */
function RespostasProntas() {
  const { aberta, inicial } = useReferencia((s) => s.respostas)
  const ref = useReferencia((s) => s.ref)
  const n = useCurrent()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const fechar = useMemo(() => () => useReferencia.setState({ respostas: { aberta: false } }), [])

  const todas = ref?.respostas ?? []
  const lista = useMemo(() => {
    const termo = normalizar(q)
    return todas.map((r, i) => ({ ...r, i })).filter((r) => !termo || normalizar(`${r.titulo} ${r.texto}`).includes(termo))
  }, [todas, q])

  // Ao abrir: volta a busca e escolhe a resposta pedida (ou a primeira).
  useEffect(() => {
    if (!aberta) return
    setQ('')
    const alvo = inicial ? todas.findIndex((r) => normalizar(r.titulo).includes(normalizar(inicial))) : -1
    setSel(alvo >= 0 ? alvo : 0)
  }, [aberta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Buscou e a resposta escolhida sumiu da lista: passa para a primeira que apareceu.
  useEffect(() => {
    if (lista.length && !lista.some((r) => r.i === sel)) setSel(lista[0].i)
  }, [lista]) // eslint-disable-line react-hooks/exhaustive-deps

  const atual = todas[sel]
  useEffect(() => {
    if (atual) setTexto(n ? preencher(atual.texto, n) : atual.texto)
    setCopiado(false)
  }, [atual, n?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const faltam = lacunas(texto)

  const proximaLacuna = () => {
    const el = area.current
    if (!el) return
    const re = new RegExp(RE_LACUNA.source, 'g')
    const inicio = el.selectionEnd
    let m: RegExpExecArray | null
    let primeira: RegExpExecArray | null = null
    while ((m = re.exec(el.value))) {
      primeira ??= m
      if (m.index >= inicio) break
    }
    const alvo = m ?? primeira
    if (!alvo) return
    el.focus()
    el.setSelectionRange(alvo.index, alvo.index + alvo[0].length)
  }

  const copiar = async () => {
    const ok = await copiarTexto(texto)
    toast(ok ? (faltam.length ? 'Copiado, mas ainda há campos a preencher' : 'Resposta copiada') : 'Não foi possível copiar', {
      type: ok ? (faltam.length ? 'warn' : 'success') : 'danger',
      duration: 2600,
    })
    if (ok) setCopiado(true)
  }

  return (
    <Janela
      aberta={aberta}
      fechar={fechar}
      titulo="Respostas prontas"
      sub={ref ? `Da planilha ${ref.versao || ref.arquivo}` : 'Carregue a planilha de referência'}
      largura="max-w-5xl h-[min(720px,100%)]"
    >
      {!ref ? (
        <div className="grid place-items-center gap-3 p-10 text-center">
          <FileSpreadsheet className="size-6 text-fg-3" />
          <p className="max-w-sm text-[13.5px] text-fg-2">As respostas vêm da aba “Finalizações - Devoluções” da planilha de referência. Ela fica só neste navegador.</p>
          <Button
            variant="primary"
            onClick={() => {
              fechar()
              abrirGerenciarPlanilha()
            }}
          >
            <Upload /> Carregar planilha
          </Button>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,40%)_minmax(0,1fr)] md:grid-cols-[300px_minmax(0,1fr)] md:grid-rows-1">
          <div className="flex min-h-0 flex-col border-b border-line md:border-r md:border-b-0">
            <div className="relative p-3">
              <Search className="pointer-events-none absolute top-1/2 left-5.5 size-4 -translate-y-1/2 text-fg-3" />
              <TextInput
                autoFocus
                value={q}
                placeholder="Buscar: DocuSign, ata, CNPJ…"
                className="pl-8"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    const pos = lista.findIndex((r) => r.i === sel)
                    const prox = lista[Math.min(Math.max(pos + (e.key === 'ArrowDown' ? 1 : -1), 0), lista.length - 1)]
                    if (prox) setSel(prox.i)
                  } else if (e.key === 'Enter' && lista[0]) {
                    e.preventDefault()
                    if (!lista.some((r) => r.i === sel)) setSel(lista[0].i)
                    window.setTimeout(proximaLacuna, 30)
                  }
                }}
              />
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {lista.map((r) => (
                <li key={r.i}>
                  <button
                    type="button"
                    onClick={() => setSel(r.i)}
                    aria-current={r.i === sel ? 'true' : undefined}
                    className={cx(
                      'relative w-full rounded-sm px-3 py-2 text-left text-[13px] leading-snug transition-colors',
                      r.i === sel ? 'bg-surface-3 font-medium text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                    )}
                  >
                    {r.i === sel && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                    {r.titulo}
                  </button>
                </li>
              ))}
              {!lista.length && <li className="px-3 py-6 text-center text-[13px] text-fg-3">Nada encontrado para “{q}”.</li>}
            </ul>
          </div>

          <div className="flex min-h-0 flex-col p-5">
            {atual ? (
              <>
                <h3 className="text-[14px] font-semibold">{atual.titulo}</h3>
                {atual.obs && <p className="mt-1 text-[12.5px] whitespace-pre-line text-fg-2">{atual.obs}</p>}
                <textarea
                  ref={area}
                  data-desfazer-nativo
                  value={texto}
                  onChange={(e) => {
                    setTexto(e.target.value)
                    setCopiado(false)
                  }}
                  spellCheck={false}
                  className="mt-3 min-h-[160px] w-full flex-1 resize-none rounded-md border border-line-strong bg-surface p-3 text-[13.5px] leading-relaxed text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {faltam.length ? (
                    <button type="button" onClick={proximaLacuna} className="mr-auto text-left text-[12.5px] font-medium text-warn hover:underline">
                      {faltam.length === 1 ? 'Falta 1 campo' : `Faltam ${faltam.length} campos`}: {[...new Set(faltam)].slice(0, 3).join(', ')}
                      {' · '}ir para o próximo
                    </button>
                  ) : (
                    <span className="mr-auto text-[12.5px] text-ok">Tudo preenchido</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTexto(n ? preencher(atual.texto, n) : atual.texto)}
                    title="Volta ao texto da planilha, preenchido de novo com os dados da anotação"
                  >
                    Restaurar
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => void copiar()}>
                    {copiado ? <Check /> : <Copy />} Copiar
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-fg-3">A planilha não tem respostas prontas.</p>
            )}
          </div>
        </div>
      )}
    </Janela>
  )
}

export function ReferenciaDialogs() {
  return (
    <>
      <GerenciarPlanilha />
      <RespostasProntas />
    </>
  )
}
