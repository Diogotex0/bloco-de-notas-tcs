import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { CalendarDays } from 'lucide-react'
import { fmtDate, parseISO, today } from '../lib/dates'
import { cx, inputBase } from './ui'

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isoParaBr = (iso: string) => fmtDate(iso)

function mascarar(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/**
 * Entende datas digitadas de forma rápida:
 * 010524 → 01/05/2024 · 01052024 · 0105 (ano atual) · 1/5/24 · hoje · ontem
 * Devolve a data em ISO, '' se vazio, ou null se inválida.
 */
export function lerData(txt: string): string | null {
  const t = txt.trim().toLowerCase()
  if (!t) return ''
  if (t === 'hoje' || t === 'h') return toISO(today())
  if (t === 'ontem') {
    const d = today()
    d.setDate(d.getDate() - 1)
    return toISO(d)
  }

  let dia: number, mes: number, ano: number
  const partes = t.split(/[^\d]+/).filter(Boolean)
  if (partes.length === 3) {
    ;[dia, mes, ano] = partes.map(Number)
    if (partes[2].length <= 2) ano = ano <= 79 ? 2000 + ano : 1900 + ano
  } else {
    const d = t.replace(/\D/g, '')
    if (d.length === 8) [dia, mes, ano] = [+d.slice(0, 2), +d.slice(2, 4), +d.slice(4)]
    else if (d.length === 6) {
      const aa = +d.slice(4)
      ;[dia, mes, ano] = [+d.slice(0, 2), +d.slice(2, 4), aa <= 79 ? 2000 + aa : 1900 + aa]
    } else if (d.length === 4) [dia, mes, ano] = [+d.slice(0, 2), +d.slice(2), today().getFullYear()]
    else return null
  }
  if (ano < 1900 || ano > 9999) return null
  const data = new Date(ano, mes - 1, dia)
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null
  return toISO(data)
}

type Props = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'type'> & {
  value: string
  onChange: (iso: string) => void
}

export function DateInput({ id, value, onChange, disabled, className, ...rest }: Props) {
  const [texto, setTexto] = useState(isoParaBr(value))
  const [focado, setFocado] = useState(false)
  const [invalida, setInvalida] = useState(false)
  const calendario = useRef<HTMLInputElement>(null)

  // Atualiza o texto quando a data muda por fora (exemplo, cópia de outra análise, Ctrl+Z).
  const ultimoEnviado = useRef(value)
  useEffect(() => {
    if (!focado || value !== ultimoEnviado.current) {
      setTexto(isoParaBr(value))
      setInvalida(false)
    }
    ultimoEnviado.current = value
  }, [value, focado])
  const enviar = (iso: string) => {
    ultimoEnviado.current = iso
    onChange(iso)
  }

  const confirmar = (t: string) => {
    const iso = lerData(t)
    if (iso === null) {
      setInvalida(true)
      if (value) enviar('')
      return
    }
    setInvalida(false)
    if (iso !== value) enviar(iso)
    setTexto(isoParaBr(iso))
  }

  const abrirCalendario = () => {
    const el = calendario.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
    }
  }

  return (
    <div className="relative min-w-0">
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="dd/mm/aaaa"
        title="Digite rápido: 010524, 01/05/2024 ou hoje"
        value={disabled ? '' : texto}
        disabled={disabled}
        aria-invalid={invalida || rest['aria-invalid'] === true}
        onFocus={() => setFocado(true)}
        onBlur={() => {
          setFocado(false)
          confirmar(texto)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar(texto)
        }}
        onChange={(e) => {
          const v = e.target.value
          setInvalida(false)
          // Começou com letra (ex.: "hoje"): deixa digitar livre.
          if (/^\s*[a-zà-ú]/i.test(v)) {
            setTexto(v)
            return
          }
          const m = mascarar(v)
          setTexto(m)
          const digitos = m.replace(/\D/g, '')
          if (digitos.length === 8) {
            const iso = lerData(m)
            if (iso) enviar(iso)
          } else if (!digitos && value) enviar('')
        }}
        className={cx(inputBase, 'pr-10 tabular-nums', className)}
      />
      {!disabled && invalida && (
        <span className="pointer-events-none absolute top-full left-0 mt-1 text-[11.5px] text-bad">Data inválida</span>
      )}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={abrirCalendario}
        aria-label="Abrir calendário"
        title="Abrir calendário"
        className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-40"
      >
        <CalendarDays className="size-4" />
      </button>
      {/* Calendário nativo escondido, aberto só pelo botão */}
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden
        data-pular
        min="1900-01-01"
        max="9999-12-31"
        value={parseISO(value) ? value : ''}
        onChange={(e) => {
          setInvalida(false)
          enviar(e.target.value)
        }}
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}
