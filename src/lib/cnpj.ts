// Suporta o CNPJ numérico e o novo CNPJ alfanumérico (Receita Federal, a partir de julho/2026).

export const cnpjClean = (s: string) => String(s ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')

export function cnpjFormat(raw: string) {
  const c = cnpjClean(raw).slice(0, 14)
  let out = ''
  for (let i = 0; i < c.length; i++) {
    if (i === 2 || i === 5) out += '.'
    if (i === 8) out += '/'
    if (i === 12) out += '-'
    out += c[i]
  }
  return out
}

export function cnpjDV(base12: string) {
  const val = (ch: string) => ch.charCodeAt(0) - 48
  const calc = (s: string, w: number[]) => {
    let sum = 0
    for (let i = 0; i < s.length; i++) sum += val(s[i]) * w[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${d1}${d2}`
}

export function cnpjValido(raw: string) {
  const c = cnpjClean(raw)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c)) return false
  if (/^(.)\1+$/.test(c)) return false
  return cnpjDV(c.slice(0, 12)) === c.slice(12)
}

const RE_CNPJ = /(?<![0-9A-Z])[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2}(?![0-9A-Z])/g

/**
 * Acha os CNPJs num texto qualquer (ex.: copiado de um site com agência, conta, endereço…).
 * Só aceita o que tem formato de CNPJ: válido, ou 14 dígitos seguidos. O resto do texto é ignorado.
 */
export function extrairCnpjs(texto: string): string[] {
  const achados = (String(texto ?? '').toUpperCase().match(RE_CNPJ) ?? []).map(cnpjClean)
  const ok = achados.filter((c) => c.length === 14 && (cnpjValido(c) || /^\d{14}$/.test(c)))
  return [...new Set(ok)]
}

/** Reformata mantendo o cursor no mesmo caractere digitado. */
export function maskCnpjInput(value: string, caret: number) {
  const before = cnpjClean(value.slice(0, caret)).length
  const formatted = cnpjFormat(value)
  let pos = 0
  let count = 0
  while (pos < formatted.length && count < before) {
    if (/[0-9A-Z]/.test(formatted[pos])) count++
    pos++
  }
  return { formatted, caret: pos }
}
