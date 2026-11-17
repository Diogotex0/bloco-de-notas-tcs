/**
 * Quando a janela flutuante está aberta, os campos vivem no documento dela, não no da aba.
 * Tudo que procura elementos, foca, rola ou copia deve passar por aqui.
 */
let pip: Window | null = null

export const setJanelaFlutuante = (w: Window | null) => {
  pip = w
}
export const janelaFlutuante = () => (pip && !pip.closed ? pip : null)
export const janela = (): Window => janelaFlutuante() ?? window
export const doc = (): Document => janela().document
export const porId = (id: string) => doc().getElementById(id)
export const menosMovimento = () => janela().matchMedia('(prefers-reduced-motion: reduce)').matches
