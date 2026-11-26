import { CircleCheck, CircleAlert, ExternalLink } from 'lucide-react'
import type { Note } from '../../lib/types'
import { cnpjClean, cnpjFormat, cnpjValido, extrairCnpjs, maskCnpjInput } from '../../lib/cnpj'
import { useNotes } from '../../store/notes'
import { Button, Callout, Field, Reveal, Segmented, TextInput } from '../ui'
import { abrirReceita } from '../../lib/actions'
import { Reaproveitar } from '../Reaproveitar'

export function Proposta({ n }: { n: Note }) {
  const editar = useNotes((s) => s.editar)
  const c = cnpjClean(n.cnpj)
  const completo = c.length === 14
  const valido = completo && cnpjValido(c)

  const hint = !c ? (
    null
  ) : !completo ? (
    <span className="text-fg-3 tabular-nums">{c.length} de 14 caracteres</span>
  ) : valido ? (
    <span className="inline-flex items-center gap-1 text-ok">
      <CircleCheck className="size-3.5" /> CNPJ válido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-bad">
      <CircleAlert className="size-3.5" /> Dígitos verificadores não conferem
    </span>
  )

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CNPJ" htmlFor="f-cnpj" hint={hint}>
          <div className="flex gap-2">
          <TextInput
            id="f-cnpj"
            value={n.cnpj}
            placeholder="00.000.000/0000-00"
            aria-invalid={completo && !valido}
            className="font-mono text-[13.5px] tracking-tight"
            onPaste={(e) => {
              // Colou um texto "sujo" (ex.: "CNPJ: 12.345.678/0001-95 - Ativa"): pega só o número.
              const t = e.clipboardData.getData('text/plain')
              const achados = extrairCnpjs(t)
              if (achados.length === 1 && cnpjClean(t) !== achados[0]) {
                e.preventDefault()
                editar((d) => void (d.cnpj = cnpjFormat(achados[0])))
              }
            }}
            onChange={(e) => {
              const el = e.currentTarget
              const { formatted, caret } = maskCnpjInput(el.value, el.selectionStart ?? el.value.length)
              editar((d) => {
                d.cnpj = formatted
              })
              requestAnimationFrame(() => {
                try {
                  if (el.ownerDocument.activeElement === el) el.setSelectionRange(caret, caret)
                } catch {
                  /* ignora */
                }
              })
            }}
          />
          <Button
            variant="outline"
            disabled={!valido}
            onClick={() => void abrirReceita(c)}
            title={valido ? 'Copia o CNPJ e abre a consulta da Receita' : 'Preencha um CNPJ válido primeiro'}
            className="px-3"
          >
            Receita <ExternalLink />
          </Button>
          </div>
        </Field>
        <Field label="Nº da proposta" htmlFor="f-proposta">
          <TextInput
            id="f-proposta"
            value={n.proposta}
            placeholder="Ex.: 2026-004871"
            onChange={(e) => editar((d) => void (d.proposta = e.target.value))}
          />
        </Field>
      </div>

      <Reaproveitar n={n} />

      <Field label="Razão social" htmlFor="f-razao">
        <TextInput
          id="f-razao"
          value={n.razaoSocial}
          placeholder="Nome da empresa como consta na proposta"
          onChange={(e) => editar((d) => void (d.razaoSocial = e.target.value))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Situação da razão social">
          <Segmented
            id="f-razaoAlterada"
            ariaLabel="Situação da razão social"
            value={n.razaoAlterada}
            onChange={(v) => editar((d) => void (d.razaoAlterada = v === true))}
            options={[
              { value: false, label: 'Não alterada' },
              { value: true, label: 'Alterada', tone: 'warn' },
            ]}
          />
        </Field>
        <Field label="Receita Federal" optional>
          <Segmented
            id="f-receita"
            ariaLabel="Situação na Receita Federal"
            value={n.receita || null}
            allowClear
            onChange={(v) => editar((d) => void (d.receita = v ?? ''))}
            options={[
              { value: 'ativo' as const, label: 'Ativo', tone: 'ok' },
              { value: 'inativo' as const, label: 'Inativo', tone: 'bad' },
            ]}
          />
        </Field>
      </div>

      <Reveal show={n.razaoAlterada}>
        <Callout tone="warn">
          <strong className="font-semibold">Razão social alterada.</strong> Lembre de atualizar o nome no cadastro.
        </Callout>
      </Reveal>
    </div>
  )
}
