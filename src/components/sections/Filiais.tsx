import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2, X } from 'lucide-react'
import type { Filial, Note, Tri } from '../../lib/types'
import { novaFilial } from '../../lib/defaults'
import { cnpjClean, cnpjFormat, cnpjValido, extrairCnpjs } from '../../lib/cnpj'
import { removerComDesfazer } from '../../lib/actions'
import { useNotes } from '../../store/notes'
import { porId } from '../../lib/janela'
import { toast } from '../../store/toast'
import { Button, Checkbox, Field, IconButton, Segmented, Tag, TextArea, cx } from '../ui'
import { EmptyMini } from '../Section'

const ordem = (r: Tri) => (r === true ? 0 : r === false ? 1 : 2)
const GRUPOS: { r: Tri; titulo: string; dot: string }[] = [
  { r: true, titulo: 'Coube réplica', dot: 'bg-ok' },
  { r: false, titulo: 'Não coube réplica', dot: 'bg-bad' },
  { r: null, titulo: 'A definir', dot: 'bg-fg-3' },
]

export function Filiais({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const [entrada, setEntrada] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const ultimo = useRef<string | null>(null)

  // Primeiro os que couberam réplica, depois os que não couberam, por último os a definir.
  const ordenadas = useMemo(
    () => n.filiais.map((f, i) => ({ f, i })).sort((a, b) => ordem(a.f.replica) - ordem(b.f.replica) || a.i - b.i).map((x) => x.f),
    [n.filiais],
  )
  const ids = new Set(n.filiais.map((f) => f.id))
  const selecionadas = [...sel].filter((id) => ids.has(id))
  const raizMatriz = cnpjClean(n.cnpj).slice(0, 8)

  const adicionar = () => {
    // Pega só os CNPJs: agência, conta, endereço e o que mais vier junto ficam de fora.
    const tokens = extrairCnpjs(entrada)
    if (!tokens.length) {
      toast(entrada.trim() ? 'Nenhum CNPJ encontrado no texto colado' : 'Cole ou digite ao menos um CNPJ', { type: 'warn' })
      porId('f-filiaisInput')?.focus()
      return
    }
    const existentes = new Set(n.filiais.map((f) => f.cnpj))
    const novas: Filial[] = []
    let repetidas = 0
    for (const t of tokens) {
      if (existentes.has(t)) {
        repetidas++
        continue
      }
      existentes.add(t)
      novas.push(novaFilial(t))
    }
    if (novas.length) editar((d) => void d.filiais.push(...novas))
    setEntrada('')
    const invalidas = novas.filter((f) => !cnpjValido(f.cnpj)).length
    const partes = [`${novas.length} ${novas.length === 1 ? 'filial adicionada' : 'filiais adicionadas'}`]
    if (repetidas) partes.push(`${repetidas} ${repetidas === 1 ? 'repetida ignorada' : 'repetidas ignoradas'}`)
    if (invalidas) partes.push(`${invalidas} para conferir`)
    toast(partes.join(' · '), { type: invalidas ? 'warn' : novas.length ? 'success' : 'info' })
  }

  const marcar = (id: string, checked: boolean, shift: boolean) => {
    setSel((prev) => {
      const next = new Set(prev)
      if (shift && ultimo.current) {
        const a = ordenadas.findIndex((f) => f.id === ultimo.current)
        const b = ordenadas.findIndex((f) => f.id === id)
        if (a >= 0 && b >= 0) {
          ordenadas.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((f) => (checked ? next.add(f.id) : next.delete(f.id)))
          return next
        }
      }
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    ultimo.current = id
  }

  const aplicar = (r: Tri) => {
    if (!selecionadas.length) return
    const alvo = new Set(selecionadas)
    editar((d) => d.filiais.forEach((f) => alvo.has(f.id) && (f.replica = r)))
    const q = selecionadas.length
    const txt = r === true ? 'coube réplica' : r === false ? 'não coube réplica' : 'a definir'
    toast(`${q} ${q === 1 ? 'filial marcada' : 'filiais marcadas'} como “${txt}”`, { type: 'success' })
    setSel(new Set())
  }

  const removerSelecionadas = () => {
    if (!selecionadas.length) return
    const alvo = new Set(selecionadas)
    const q = alvo.size
    removerComDesfazer(`${q} ${q === 1 ? 'filial removida' : 'filiais removidas'}`, (d) => {
      d.filiais = d.filiais.filter((f) => !alvo.has(f.id))
    })
    setSel(new Set())
  }

  const contagem = { sim: 0, nao: 0, nd: 0 }
  n.filiais.forEach((f) => (f.replica === true ? contagem.sim++ : f.replica === false ? contagem.nao++ : contagem.nd++))
  const todas = n.filiais.length > 0 && selecionadas.length === n.filiais.length

  return (
    <div className="grid gap-4">
      <Field label="A empresa tem filiais?">
        <Segmented
          id="f-temFiliais"
          ariaLabel="A empresa tem filiais?"
          value={n.temFiliais}
          allowClear
          onChange={(v) => editar((d) => void (d.temFiliais = v))}
          options={[
            { value: true, label: 'Sim' },
            { value: false, label: 'Não' },
          ]}
        />
      </Field>

      <AnimatePresence initial={false}>
        {n.temFiliais === true && (
          <motion.div
            key="filiais"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            style={{ overflow: 'hidden' }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="grid gap-4 pt-1">
              {/* Entrada em lote */}
              <div className="grid gap-2">
                <Field label="Adicionar CNPJs das filiais" htmlFor="f-filiaisInput">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <TextArea
                      id="f-filiaisInput"
                      value={entrada}
                      rows={2}
                      className="min-h-[64px] font-mono text-[13px]"
                      placeholder="Cole aqui. Pode vir com agência, conta e outros dados: só os CNPJs entram."
                      onChange={(e) => setEntrada(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          adicionar()
                        }
                      }}
                    />
                    <Button variant="outline" onClick={adicionar}>
                      <Plus /> Adicionar
                    </Button>
                  </div>
                </Field>
              </div>

              {n.filiais.length === 0 ? (
                <EmptyMini>Nenhuma filial ainda.</EmptyMini>
              ) : (
                <>
                  {/* Barra de ações em lote */}
                  <div className="sticky top-[60px] z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5">
                    <Checkbox
                      checked={todas}
                      indeterminate={selecionadas.length > 0 && !todas}
                      onChange={(v) => setSel(v ? new Set(n.filiais.map((f) => f.id)) : new Set())}
                      label={
                        <span className="text-[13px] text-fg-2 tabular-nums">
                          {selecionadas.length ? `${selecionadas.length} selecionada${selecionadas.length > 1 ? 's' : ''}` : 'Selecionar todas'}
                        </span>
                      }
                    />
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="ok" disabled={!selecionadas.length} onClick={() => aplicar(true)}>
                        Coube réplica
                      </Button>
                      <Button size="sm" variant="bad" disabled={!selecionadas.length} onClick={() => aplicar(false)}>
                        Não coube
                      </Button>
                      <Button size="sm" variant="ghost" disabled={!selecionadas.length} onClick={() => aplicar(null)}>
                        <X /> Limpar
                      </Button>
                      <IconButton label="Remover selecionadas" tone="danger" disabled={!selecionadas.length} onClick={removerSelecionadas} className="disabled:opacity-40">
                        <Trash2 />
                      </IconButton>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[12.5px]">
                    <Tag tone="ok">{contagem.sim} com réplica</Tag>
                    <Tag tone="bad">{contagem.nao} sem réplica</Tag>
                    {contagem.nd > 0 && <Tag tone="muted">{contagem.nd} a definir</Tag>}
                  </div>

                  {/* Lista agrupada: os itens deslizam para o grupo certo ao mudar */}
                  <div className="relative grid gap-1.5">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {GRUPOS.flatMap((g) => {
                        const doGrupo = ordenadas.filter((f) => f.replica === g.r)
                        if (!doGrupo.length) return []
                        return [
                          <motion.div
                            key={`g-${String(g.r)}`}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 flex items-center gap-2 px-1 text-[12.5px] font-semibold text-fg-2 first:mt-0"
                          >
                            <span className={cx('size-1.5 rounded-full', g.dot)} />
                            {g.titulo}
                            <span className="font-medium tabular-nums">({doGrupo.length})</span>
                          </motion.div>,
                          ...doGrupo.map((f) => (
                            <LinhaFilial
                              key={f.id}
                              f={f}
                              selecionada={sel.has(f.id)}
                              raizDiferente={raizMatriz.length === 8 && f.cnpj.length === 14 && f.cnpj.slice(0, 8) !== raizMatriz}
                              onSelect={(v, shift) => marcar(f.id, v, shift)}
                            />
                          )),
                        ]
                      })}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LinhaFilial({
  f,
  selecionada,
  raizDiferente,
  onSelect,
}: {
  f: Filial
  selecionada: boolean
  raizDiferente: boolean
  onSelect: (v: boolean, shift: boolean) => void
}) {
  const editar = useNotes((s) => s.editar)
  const valido = cnpjValido(f.cnpj)
  const barra = f.replica === true ? 'bg-ok' : f.replica === false ? 'bg-bad' : 'bg-line-strong'
  return (
    <motion.div
      id={`fil-${f.id}`}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      data-flash
      className={cx(
        'relative flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden rounded-md border py-1 pr-1.5 pl-4 transition-colors duration-100',
        selecionada ? 'border-primary/45 bg-primary-soft' : 'border-line bg-surface hover:bg-surface-2',
      )}
    >
      <span className={cx('absolute inset-y-0 left-0 w-0.5', barra)} />
      <Checkbox checked={selecionada} onChange={onSelect} ariaLabel={`Selecionar ${cnpjFormat(f.cnpj)}`} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="font-mono text-[13.5px] tracking-tight text-fg tabular-nums">{cnpjFormat(f.cnpj)}</span>
        {!valido && <Tag tone="warn">CNPJ inválido</Tag>}
        {valido && raizDiferente && <Tag tone="muted">raiz diferente da matriz</Tag>}
      </div>
      <Segmented
        size="sm"
        ariaLabel="Réplica"
        value={f.replica}
        allowClear
        onChange={(v) =>
          editar((d) => {
            const x = d.filiais.find((y) => y.id === f.id)
            if (x) x.replica = v
          })
        }
        options={[
          { value: true, label: 'Coube', tone: 'ok' },
          { value: false, label: 'Não coube', tone: 'bad' },
        ]}
      />
      <IconButton
        label="Remover filial"
        tone="danger"
        onClick={() =>
          removerComDesfazer(`Filial ${cnpjFormat(f.cnpj)} removida`, (d) => {
            d.filiais = d.filiais.filter((x) => x.id !== f.id)
          })
        }
      >
        <Trash2 />
      </IconButton>
    </motion.div>
  )
}
