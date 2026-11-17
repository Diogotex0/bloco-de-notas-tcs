import type { Note } from './types'
import { novaFilial, novaNota, novaRegra, novoApoio, novoGrupo, novoRecebido } from './defaults'
import { cnpjDV, cnpjFormat } from './cnpj'

// Dados 100% fictícios, só para demonstração.
const cnpj = (base12: string) => base12 + cnpjDV(base12)

export function notaExemplo(): Note {
  const n = novaNota()
  n.cnpj = cnpjFormat(cnpj('112223330001'))
  n.proposta = '2026-004871'
  n.razaoSocial = 'Alfa Distribuidora de Peças Ltda'
  n.receita = 'ativo'

  const diretor = { ...novoGrupo('DIRETOR'), inicio: '2024-05-01', duracao: '2028-04-30' }
  const adm = { ...novoGrupo('ADMINISTRADOR'), inicio: '2021-03-10', indeterminado: true }
  const proc = { ...novoGrupo('PROCURADOR'), inicio: '2026-03-15', duracao: '2027-03-15' }
  n.grupos = [diretor, adm, proc]

  n.docsRecebidos = [{ ...novoRecebido(), tipo: 'Procuração Particular', validado: true }]
  n.docsApoio = [
    { ...novoApoio(), tipo: 'Contrato Social', origem: 'Junta Comercial', data: '2025-08-12', anexado: true },
    { ...novoApoio(), tipo: 'Ata de Reunião ou Assembleia de Sócios', origem: 'Sharefiche 1', data: '2026-02-03' },
  ]
  n.outorga = { emissao: '2026-03-15', qtd: '1', unidade: 'anos', indeterminada: false }
  n.garantidor = false
  n.dataGarantias = '2026-11-10'

  n.temFiliais = true
  const reps = [true, true, false, null, true]
  n.filiais = reps.map((r, i) => ({ ...novaFilial(cnpj(`11222333000${i + 2}`)), replica: r }))

  n.regras = [
    { ...novaRegra(), grupos: [diretor.id], modo: 'isolado', limite: '1000000' },
    { ...novaRegra(), grupos: [diretor.id, adm.id], modo: 'conjunto', semLimite: true },
    {
      ...novaRegra(),
      grupos: [proc.id],
      modo: 'isolado',
      limite: '500000',
      requerAut: true,
      autorizacao: 'aprovação da Diretoria Financeira',
    },
  ]
  n.quoruns = 'Acima de R$ 5MM: DIRETOR em conjunto com ADMINISTRADOR, com aprovação prévia do Conselho.'
  n.anotacoes = 'Procuração validada no ITI. Print anexado na proposta.'
  return n
}
