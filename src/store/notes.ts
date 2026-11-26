import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Note } from '../lib/types'
import { DATA_BASE_GARANTIAS, PP, normalizarNota, notaVazia, novaNota, uid } from '../lib/defaults'
import { notaExemplo } from '../lib/example'

export const NOTES_KEY = 'bloco-poderes:notas'
export const DIAS_LIXEIRA = 30
const DIA = 864e5

// Estado do salvamento, mostrado na barra do topo.
export const useSaveStatus = create<{ error: boolean; savedAt: number; available: boolean }>(() => ({
  error: false,
  savedAt: 0,
  available: true,
}))

function storageDisponivel() {
  try {
    localStorage.setItem('__teste', '1')
    localStorage.removeItem('__teste')
    return true
  } catch {
    return false
  }
}

// Envolve o localStorage para nunca quebrar a tela (modo anônimo, cota cheia, bloqueio do navegador).
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
      useSaveStatus.setState({ error: false, savedAt: Date.now() })
    } catch {
      useSaveStatus.setState({ error: true })
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignora */
    }
  },
}

/** Anotação ativa mais recente (fora da lixeira), para abrir quando a atual sai. */
const proxima = (notes: Note[], exceto?: string) =>
  [...notes].filter((n) => !n.excluidaEm && n.id !== exceto).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null

/** Data da base de garantias usada na análise editada mais recentemente. */
export const ultimaBaseGarantias = (notes: Note[], exceto?: string) =>
  [...notes]
    .filter((n) => n.dataGarantias && !n.excluidaEm && n.id !== exceto)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.dataGarantias ?? ''

/* ---------- Histórico para Ctrl+Z / Ctrl+Y (só na memória, por anotação) ---------- */
const HIST_MAX = 150
const historico = new Map<string, { passado: Note[]; futuro: Note[]; ultimo: number }>()
const hist = (id: string) => {
  let h = historico.get(id)
  if (!h) {
    h = { passado: [], futuro: [], ultimo: 0 }
    historico.set(id, h)
  }
  return h
}
/** Guarda a anotação antes de mudar. Digitação seguida (menos de 0,7 s entre teclas) vira um passo só. */
function registrar(n: Note | undefined, agrupar: boolean) {
  if (!n) return
  const h = hist(n.id)
  const agora = Date.now()
  if (!agrupar || agora - h.ultimo > 700) {
    h.passado.push(n) // o estado é imutável, então guardar a referência é seguro e leve
    if (h.passado.length > HIST_MAX) h.passado.shift()
  }
  h.ultimo = agora
  h.futuro = []
}

interface NotesState {
  notes: Note[]
  currentId: string | null
  criar: (base?: Note) => string
  abrir: (id: string | null) => void
  /** passo = vira um passo próprio no desfazer (não junta com a digitação). */
  editar: (fn: (n: Note) => void, passo?: boolean) => void
  /** Manda para a lixeira (não apaga). */
  excluir: (id: string) => void
  tirarDaLixeira: (id: string) => void
  excluirDeVez: (id: string) => void
  esvaziarLixeira: () => void
  restaurar: (note: Note, index?: number) => void
  duplicar: () => void
  exemplo: () => void
  reaproveitarDe: (origemId: string) => { procuracaoResetada: boolean } | null
  importar: (raw: unknown) => { novas: number; atualizadas: number; ignoradas: number }
  desfazer: () => boolean
  refazer: () => boolean
}

export const useNotes = create<NotesState>()(
  persist(
    immer((set, get) => {
      // Remove a anotação aberta se o usuário saiu dela sem preencher nada.
      const limparVazia = (s: NotesState, exceto?: string) => {
        const atual = s.notes.find((n) => n.id === s.currentId)
        if (atual && atual.id !== exceto && !atual.excluidaEm && notaVazia(atual)) s.notes = s.notes.filter((n) => n.id !== atual.id)
      }

      return {
        notes: [],
        currentId: null,

        criar: (base) => {
          const n = base ?? novaNota()
          // A base de garantias é a mesma para todas as análises: já vem com a data fixa.
          if (!base) n.dataGarantias = DATA_BASE_GARANTIAS
          set((s) => {
            limparVazia(s)
            s.notes.unshift(n)
            s.currentId = n.id
          })
          return n.id
        },

        abrir: (id) =>
          set((s) => {
            if (id === s.currentId) return
            limparVazia(s, id ?? undefined)
            s.currentId = id && s.notes.some((n) => n.id === id) ? id : null
          }),

        editar: (fn, passo = false) => {
          registrar(get().notes.find((x) => x.id === get().currentId), !passo)
          set((s) => {
            const n = s.notes.find((x) => x.id === s.currentId)
            if (!n) return
            fn(n)
            n.updatedAt = Date.now()
          })
        },

        desfazer: () => {
          const atual = get().notes.find((x) => x.id === get().currentId)
          if (!atual) return false
          const h = hist(atual.id)
          const anterior = h.passado.pop()
          if (!anterior) return false
          h.futuro.push(atual)
          h.ultimo = 0
          set((s) => {
            const i = s.notes.findIndex((x) => x.id === atual.id)
            if (i >= 0) s.notes[i] = { ...anterior, updatedAt: Date.now() }
          })
          return true
        },

        refazer: () => {
          const atual = get().notes.find((x) => x.id === get().currentId)
          if (!atual) return false
          const h = hist(atual.id)
          const prox = h.futuro.pop()
          if (!prox) return false
          h.passado.push(atual)
          h.ultimo = 0
          set((s) => {
            const i = s.notes.findIndex((x) => x.id === atual.id)
            if (i >= 0) s.notes[i] = { ...prox, updatedAt: Date.now() }
          })
          return true
        },

        excluir: (id) =>
          set((s) => {
            const n = s.notes.find((x) => x.id === id)
            if (!n) return
            n.excluidaEm = Date.now()
            if (s.currentId === id) s.currentId = proxima(s.notes, id)
          }),

        tirarDaLixeira: (id) =>
          set((s) => {
            const n = s.notes.find((x) => x.id === id)
            if (!n) return
            n.excluidaEm = 0
            n.updatedAt = Date.now()
            s.currentId = id
          }),

        excluirDeVez: (id) =>
          set((s) => {
            s.notes = s.notes.filter((n) => n.id !== id)
            if (s.currentId === id) s.currentId = proxima(s.notes)
          }),

        esvaziarLixeira: () =>
          set((s) => {
            const atualNaLixeira = s.notes.find((n) => n.id === s.currentId)?.excluidaEm
            s.notes = s.notes.filter((n) => !n.excluidaEm)
            if (atualNaLixeira) s.currentId = proxima(s.notes)
          }),

        restaurar: (note, index) => {
          registrar(get().notes.find((x) => x.id === note.id), false)
          set((s) => {
            const i = s.notes.findIndex((n) => n.id === note.id)
            if (i >= 0) s.notes[i] = note
            else s.notes.splice(Math.min(index ?? 0, s.notes.length), 0, note)
            s.currentId = note.id
          })
        },

        duplicar: () => {
          const atual = get().notes.find((n) => n.id === get().currentId)
          if (!atual) return
          const copia = structuredClone(atual)
          copia.id = uid()
          copia.createdAt = copia.updatedAt = Date.now()
          copia.situacao = 'analise'
          copia.anexosOk = []
          copia.excluidaEm = 0
          set((s) => {
            s.notes.unshift(copia)
            s.currentId = copia.id
          })
        },

        exemplo: () => {
          get().criar(notaExemplo())
        },

        // Copia grupos, documentos e filiais de outra análise do mesmo CNPJ.
        reaproveitarDe: (origemId) => {
          const origem = get().notes.find((n) => n.id === origemId)
          if (!origem || !get().currentId) return null
          const src = structuredClone(origem)
          let procuracaoResetada = false
          registrar(get().notes.find((x) => x.id === get().currentId), false)
          set((s) => {
            const n = s.notes.find((x) => x.id === s.currentId)
            if (!n) return
            const novosIds = new Map(src.grupos.map((g) => [g.id, uid()]))
            n.grupos = src.grupos.map((g) => ({ ...g, id: novosIds.get(g.id)!, substabeleceuDe: novosIds.get(g.substabeleceuDe) ?? '' }))
            if (!n.tipoSocietario) n.tipoSocietario = src.tipoSocietario
            if (!n.uf) n.uf = src.uf
            // A validação da procuração particular vale só para aquela proposta: precisa ser refeita.
            const doc = <T extends { id: string; tipo: string; validado: boolean }>(d: T): T => {
              if (d.tipo === PP && d.validado) procuracaoResetada = true
              return { ...d, id: uid(), validado: d.tipo === PP ? false : d.validado, semValidacao: false }
            }
            n.docsRecebidos = src.docsRecebidos.map(doc)
            n.docsApoio = src.docsApoio.map(doc)
            n.temFiliais = src.temFiliais
            n.filiais = src.filiais.map((f) => ({ ...f, id: uid() }))
            if (!n.razaoSocial.trim()) n.razaoSocial = src.razaoSocial
            n.reaproveitar = 'feito'
            n.updatedAt = Date.now()
          })
          return { procuracaoResetada }
        },

        importar: (raw) => {
          const arr = Array.isArray(raw)
            ? raw
            : raw && typeof raw === 'object' && Array.isArray((raw as { notes?: unknown }).notes)
              ? (raw as { notes: unknown[] }).notes
              : null
          if (!arr) throw new Error('formato')
          let novas = 0,
            atualizadas = 0,
            ignoradas = 0
          set((s) => {
            for (const item of arr) {
              const n = normalizarNota(item)
              if (!n) {
                ignoradas++
                continue
              }
              const i = s.notes.findIndex((x) => x.id === n.id)
              if (i < 0) {
                s.notes.push(n)
                novas++
              } else if (n.updatedAt > s.notes[i].updatedAt) {
                s.notes[i] = n
                atualizadas++
              } else ignoradas++
            }
            if (!s.currentId) s.currentId = proxima(s.notes)
          })
          return { novas, atualizadas, ignoradas }
        },
      }
    }),
    {
      name: NOTES_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ notes: s.notes, currentId: s.currentId }),
      // Valida tudo que vem do armazenamento e apaga o que está na lixeira há mais de 30 dias.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { notes?: unknown; currentId?: unknown }
        const limite = Date.now() - DIAS_LIXEIRA * DIA
        const notes = (Array.isArray(p.notes) ? p.notes.map(normalizarNota).filter((n): n is Note => !!n) : []).filter(
          (n) => !n.excluidaEm || n.excluidaEm > limite,
        )
        const currentId =
          typeof p.currentId === 'string' && notes.some((n) => n.id === p.currentId && !n.excluidaEm) ? p.currentId : proxima(notes)
        return { ...current, notes, currentId }
      },
    },
  ),
)

useSaveStatus.setState({ available: storageDisponivel() })

// Mantém abas diferentes do navegador em sincronia.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === NOTES_KEY) void useNotes.persist.rehydrate()
  })
}

export const useCurrent = () => useNotes((s) => s.notes.find((n) => n.id === s.currentId) ?? null)

export const diasRestantesLixeira = (n: Note) =>
  Math.max(0, Math.ceil((n.excluidaEm + DIAS_LIXEIRA * DIA - Date.now()) / DIA))
