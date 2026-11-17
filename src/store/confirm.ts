import { create } from 'zustand'

interface Pedido {
  titulo: string
  texto: string
  botao: string
}

export const useConfirm = create<{ pedido: Pedido | null; responder: (ok: boolean) => void }>(() => ({
  pedido: null,
  responder: () => {},
}))

/** Abre a janela de confirmação e espera a resposta. */
export function confirmar(p: Pedido): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirm.setState({
      pedido: p,
      responder: (ok) => {
        useConfirm.setState({ pedido: null })
        resolve(ok)
      },
    })
  })
}
