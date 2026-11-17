import { Component, type ReactNode } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'

/** Se algo der errado na tela, mostra um aviso amigável em vez de uma página em branco. Os dados continuam salvos. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  componentDidCatch(e: unknown) {
    console.error(e)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6">
        <div className="max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-pop">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-warn-soft text-warn">
            <TriangleAlert className="size-6" />
          </div>
          <h1 className="text-[17px] font-semibold">Algo deu errado na tela</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">
            Suas anotações continuam salvas. Recarregue a página para continuar de onde parou.
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-medium text-on-primary hover:bg-primary-hover"
          >
            <RotateCw className="size-4" /> Recarregar
          </button>
        </div>
      </div>
    )
  }
}
