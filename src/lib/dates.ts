const pad = (n: number) => String(n).padStart(2, '0')

export function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1 ? null : d
}

export function fmtDate(v: string | Date | null | undefined) {
  const d = typeof v === 'string' ? parseISO(v) : v
  if (!d) return ''
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function today() {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Soma meses sem "pular" mês (31/01 + 1 mês = 28 ou 29/02). */
export function addMonths(d: Date, months: number) {
  const y = d.getFullYear()
  const m = d.getMonth() + months
  const last = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(d.getDate(), last))
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5)

export function relTime(ts: number) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  return fmtDate(new Date(ts)).slice(0, 5)
}
