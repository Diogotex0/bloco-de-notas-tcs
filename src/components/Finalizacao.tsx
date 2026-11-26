import { useState } from 'react'
import { Check, Copy, MessageSquareText } from 'lucide-react'
import type { Note } from '../lib/types'
import { textoCliente, textoFollowUp } from '../lib/finalizacao'
import { copiarTexto } from '../lib/actions'
import { toast } from '../store/toast'
import { abrirRespostas, useReferencia } from '../store/referencia'
import { useNotes } from '../store/notes'
import { sugestoes } from '../lib/sugestoes'
import { Button, cx } from './ui'

function Bloco({ titulo, desc, texto, vazio }: { titulo: string; desc: string; texto: string; vazio: string }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    const r = await copiarTexto(texto)
    toast(r ? `${titulo} copiado` : 'Não foi possível copiar', { type: r ? 'success' : 'danger', duration: 2200 })
    if (r) {
      setOk(true)
      window.setTimeout(() => setOk(false), 1500)
    }
  }
  return (
    <section>
      <div className="mb-1.5 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold">{titulo}</h3>
          <p className="text-[12px] text-fg-3">{desc}</p>
        </div>
        <Button size="sm" variant="soft" disabled={!texto} onClick={() => void copiar()} className="h-7 px-2 text-[12px]">
          {ok ? <Check /> : <Copy />} Copiar
        </Button>
      </div>
      {texto ? (
        <pre
          className={cx(
            'rounded-md border border-line bg-surface-2 p-3 font-mono text-[12.5px] leading-[1.6] break-words whitespace-pre-wrap text-fg',
          )}
        >
          {texto.split(/(__\/__\/____|Livro __|Folha __)/).map((parte, i) =>
            i % 2 ? (
              <mark key={i} className="rounded-[2px] bg-warn-soft px-0.5 text-warn" title="Falta preencher">
                {parte}
              </mark>
            ) : (
              parte
            ),
          )}
        </pre>
      ) : (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-[12.5px] text-fg-3">{vazio}</p>
      )}
    </section>
  )
}

/** Aba "Finalização" do painel: observação para o cliente e follow-up prontos para copiar. */
export function Finalizacao({ n }: { n: Note }) {
  const ref = useReferencia((s) => s.ref)
  const notas = useNotes((s) => s.notes)
  const sugeridas = sugestoes(n, ref, notas)
  const cliente = textoCliente(n)
  const fup = textoFollowUp(n)
  const falta = /__\/__\/____|Livro __|Folha __/.test(cliente + fup)
  return (
    <div className="grid gap-4">
      <Bloco
        titulo="Observação para o cliente"
        desc="O que foi cadastrado e com base em quê."
        texto={cliente}
        vazio="Informe o documento utilizado para montar este texto."
      />
      <Bloco
        titulo="Follow-up"
        desc="Grupos, documentos, filiais, garantidor e razão social."
        texto={fup}
        vazio="Preencha as etapas para montar o follow-up."
      />
      {falta && <p className="text-[12px] text-warn">Os trechos marcados estão em branco na anotação.</p>}
      {sugeridas.length > 0 && (
        <section className="border-t border-line pt-3">
          <h3 className="text-[13px] font-semibold">Respostas sugeridas</h3>
          <p className="mb-1.5 text-[12px] text-fg-3">Pelo que está preenchido nesta anotação.</p>
          <ul className="grid gap-1">
            {sugeridas.map((sg) => (
              <li key={sg.titulo}>
                <button
                  type="button"
                  onClick={() => abrirRespostas(sg.titulo)}
                  className="w-full rounded-sm border border-line px-2.5 py-1.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="block text-[13px] font-medium text-fg">{sg.titulo}</span>
                  <span className="block text-[12px] text-fg-3">{sg.motivo}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="border-t border-line pt-3">
        <Button size="sm" variant="outline" onClick={() => abrirRespostas()}>
          <MessageSquareText /> Respostas prontas{ref ? ` (${ref.respostas.length})` : ''}
        </Button>
        <p className="mt-1.5 text-[12px] text-fg-3">
          {ref ? 'Pendências, devoluções e outros textos da planilha, já com os dados desta anotação.' : 'Carregue a planilha de referência para usar os textos dela.'}
        </p>
      </div>
    </div>
  )
}
