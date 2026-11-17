import { create } from 'zustand'

export type AcaoAnexos = 'copiar' | 'finalizar' | 'confirmar'
export const useAnexos = create<{ acao: AcaoAnexos | null }>(() => ({ acao: null }))
export const pedirConferencia = (acao: AcaoAnexos) => useAnexos.setState({ acao })
