export const moneyDigits = (s: string) => s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15)

export const moneyInput = (digits: string) => (digits ? Number(digits).toLocaleString('pt-BR') : '')

export const moneyFull = (digits: string) =>
  'R$ ' + Number(digits || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function moneyShort(digits: string) {
  const n = Number(digits || 0)
  const f = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  if (n >= 1e9) return `${f(n / 1e9)} bi`
  if (n >= 1e6) return `${f(n / 1e6)} MM`
  if (n >= 1e3) return `${f(n / 1e3)} mil`
  return f(n)
}
