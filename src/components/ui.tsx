import { useEffect, useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Info, TriangleAlert, CircleCheck, OctagonAlert } from 'lucide-react'
import clsx from 'clsx'

export const cx = clsx

/* ---------- Botões ---------- */
type BtnVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'ok' | 'bad'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  soft: 'border border-line-strong bg-surface text-fg hover:bg-surface-3',
  ghost: 'text-fg-2 hover:bg-surface-3 hover:text-fg',
  outline: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
  danger: 'text-bad hover:bg-bad-soft',
  ok: 'border border-ok-line bg-surface text-ok hover:bg-ok-soft',
  bad: 'border border-bad-line bg-surface text-bad hover:bg-bad-soft',
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  ...p
}: ComponentProps<'button'> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-[13.5px]',
        btnVariants[variant],
        className,
      )}
    />
  )
}

export function IconButton({
  label,
  tone = 'default',
  className,
  ...p
}: ComponentProps<'button'> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...p}
      className={cx(
        'grid size-8 shrink-0 place-items-center rounded-md text-fg-3 transition-colors duration-100 [&_svg]:size-4',
        tone === 'danger' ? 'hover:bg-bad-soft hover:text-bad' : 'hover:bg-surface-3 hover:text-fg',
        className,
      )}
    />
  )
}

/* ---------- Campos ---------- */
export const inputBase =
  'h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-[14px] text-fg placeholder:text-fg-3 outline-none transition-[border-color,box-shadow] duration-100 hover:border-fg-3/60 focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-3 aria-invalid:border-bad aria-invalid:focus:ring-bad'

export function Field({
  label,
  htmlFor,
  hint,
  optional,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)} data-flash>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg-2">
        {label}
        {optional && <span className="font-normal text-fg-3">(opcional)</span>}
      </label>
      {children}
      {hint && <div className="min-h-[18px] text-[12px] leading-[18px]">{hint}</div>}
    </div>
  )
}

export function TextInput({ className, ...p }: ComponentProps<'input'>) {
  return <input autoComplete="off" spellCheck={false} {...p} className={cx(inputBase, className)} />
}

export function TextArea({ className, value, ref: refExterno, ...p }: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const juntarRefs = (el: HTMLTextAreaElement | null) => {
    ref.current = el
    if (typeof refExterno === 'function') refExterno(el)
    else if (refExterno) refExterno.current = el
  }
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <textarea
      ref={juntarRefs}
      rows={3}
      value={value}
      {...p}
      className={cx(inputBase, 'h-auto min-h-[84px] resize-none py-2 leading-relaxed', className)}
    />
  )
}

export function Select({
  className,
  options,
  placeholder,
  ...p
}: ComponentProps<'select'> & { options: (string | [string, string])[]; placeholder?: string }) {
  return (
    <div className="relative min-w-0">
      <select {...p} className={cx(inputBase, 'cursor-pointer appearance-none pr-9', !p.value && 'text-fg-3', className)}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o]
          return (
            <option key={v} value={v} className="text-fg">
              {l}
            </option>
          )
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-3" />
    </div>
  )
}

/* ---------- Seletor segmentado com "pílula" deslizante ---------- */
type Tone = 'default' | 'ok' | 'bad' | 'warn'
const pillOn: Record<Tone, string> = {
  default: 'bg-fg text-surface',
  ok: 'bg-ok text-surface',
  bad: 'bg-bad text-surface',
  warn: 'bg-warn text-surface',
}

export function Segmented<T extends string | boolean>({
  id,
  value,
  options,
  onChange,
  allowClear,
  size = 'md',
  ariaLabel,
}: {
  id?: string
  value: T | null
  options: { value: T; label: ReactNode; tone?: Tone }[]
  onChange: (v: T | null) => void
  allowClear?: boolean
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  const grupo = useRef<HTMLDivElement>(null)
  const textoDe = (l: ReactNode) => (typeof l === 'string' ? l : '')
  const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const temSimNao = options.some((o) => textoDe(o.label) === 'Sim')

  // Teclado: S/N (ou a primeira letra da opção) e setas esquerda/direita escolhem a opção.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return
    const atual = options.findIndex((o) => o.value === value)
    let i = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = Math.min(options.length - 1, atual + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = Math.max(0, atual < 0 ? 0 : atual - 1)
    else if (e.key.length === 1) {
      const k = semAcento(e.key)
      i = options.findIndex((o) => semAcento(textoDe(o.label)).startsWith(k))
    }
    if (i < 0) return
    e.preventDefault()
    if (options[i].value !== value) onChange(options[i].value)
    requestAnimationFrame(() => grupo.current?.querySelectorAll('button')[i]?.focus())
  }

  return (
    <div
      ref={grupo}
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      title={temSimNao ? 'Atalho: tecle S ou N' : undefined}
      onKeyDown={onKeyDown}
      className="inline-flex w-fit max-w-full divide-x divide-line-strong overflow-hidden rounded-md border border-line-strong bg-surface"
    >
      {options.map((o) => {
        const active = value === o.value
        const tone = o.tone ?? 'default'
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && allowClear ? null : o.value)}
            className={cx(
              'font-medium whitespace-nowrap transition-colors duration-100',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-[34px] px-3.5 text-[13px]',
              active ? pillOn[tone] : 'text-fg-2 hover:bg-surface-3 hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Checkbox com check desenhado ---------- */
export function Checkbox({
  id,
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
  className,
  ariaLabel,
}: {
  id?: string
  checked: boolean
  indeterminate?: boolean
  onChange: (v: boolean, shift: boolean) => void
  label?: ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked
  }, [indeterminate, checked])
  const on = checked || !!indeterminate
  return (
    <label
      className={cx(
        'group inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-[13.5px] text-fg select-none',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      data-flash
    >
      <span className="relative grid size-4 shrink-0 place-items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked, !!(e.nativeEvent as MouseEvent).shiftKey)}
          className={cx(
            'peer size-4 cursor-pointer appearance-none rounded-sm border transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            on ? 'border-primary bg-primary' : 'border-line-strong bg-surface group-hover:border-fg-3',
          )}
        />
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute size-3 text-on-primary" aria-hidden>
          {indeterminate && !checked ? (
            <path d="M6 12h12" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" />
          ) : (
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ opacity: checked ? 1 : 0 }}
              transition={{ duration: 0.08 }}
            />
          )}
        </svg>
      </span>
      {label && <span className="leading-snug">{label}</span>}
    </label>
  )
}

/* ---------- Avisos, etiquetas e atalhos ---------- */
const calloutStyle = {
  info: ['border-l-primary text-fg', 'text-primary-ink', Info],
  warn: ['border-l-warn text-fg', 'text-warn', TriangleAlert],
  ok: ['border-l-ok text-fg', 'text-ok', CircleCheck],
  bad: ['border-l-bad text-fg', 'text-bad', OctagonAlert],
} as const

export function Callout({ tone = 'info', children, className }: { tone?: keyof typeof calloutStyle; children: ReactNode; className?: string }) {
  const [box, icon, Icon] = calloutStyle[tone]
  return (
    <div className={cx('flex items-start gap-2.5 rounded-md border border-line border-l-2 bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed', box, className)}>
      <Icon className={cx('mt-0.5 size-4 shrink-0', icon)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Mostra/esconde com animação de altura. */
export function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className={className}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const tagTone = {
  ok: 'border-ok-line text-ok',
  bad: 'border-bad-line text-bad',
  warn: 'border-warn-line text-warn',
  muted: 'border-line-strong text-fg-2',
  primary: 'border-primary/30 text-primary-ink',
}
export function Tag({ tone = 'muted', children, className }: { tone?: keyof typeof tagTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[11.5px] font-medium whitespace-nowrap [&_svg]:size-3', tagTone[tone], className)}>
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-sm border border-b-2 border-line-strong bg-surface px-1 font-mono text-[10.5px] font-medium text-fg-3">
      {children}
    </kbd>
  )
}

/** Animação padrão para itens de lista que entram e saem. */
export const itemMotion = {
  layout: 'position',
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.1 } },
  transition: { duration: 0.14, ease: 'easeOut' },
} as const

export const itemCard = 'rounded-md border border-line bg-surface p-4'
