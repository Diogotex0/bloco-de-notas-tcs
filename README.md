<div align="center">

# 📝 Bloco de Poderes

**O bloco de notas da análise de poderes de clientes PJ, só que ele lembra das coisas por você.**

Segue a ordem do trabalho do analista, avisa o que está faltando, impede o esquecimento da validação da procuração particular e gera o texto da anotação pronto para colar.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Offline](https://img.shields.io/badge/funciona-offline-22c55e)
![Sem servidor](https://img.shields.io/badge/dados-só_no_seu_navegador-6470ff)

**[🌐 Abrir o Bloco de Poderes](https://diogotex0.github.io/bloco-de-notas-tcs/)**

<img src="docs/tela-clara.jpg" alt="Bloco de Poderes no modo claro" width="49%" />
<img src="docs/tela-escura.jpg" alt="Bloco de Poderes no modo escuro" width="49%" />

</div>

---

## 💡 Por que existe

Na análise de poderes, o analista anota CNPJ, proposta, grupos, mandatos, documentos, garantidor, filiais e formas de assinatura, e depois escreve a anotação final. Na prática:

- **Esquece-se de anexar a validação** da procuração particular (o erro mais comum);
- **Esquece-se a data e a origem** do documento de apoio;
- Perde-se tempo **digitando e formatando** o mesmo texto toda vez.

O Bloco de Poderes resolve isso **sem mexer em nenhum sistema interno**: é só uma página que abre no navegador.

> ⚠️ A ferramenta **não interpreta documentos** e não toma decisões. A análise continua sendo do analista; o bloco só organiza, lembra e formata.

---

## ✨ O que ele faz

### Anotação guiada, em 6 etapas
| # | Etapa | O que tem |
|---|---|---|
| 1 | **Proposta** | CNPJ com máscara e validação (inclusive o novo CNPJ alfanumérico), nº da proposta, razão social, tipo societário e estado (UF), situação na Receita, botão que copia o CNPJ e abre a consulta da Receita |
| 2 | **Grupos e mandatos** | Grupos com nome livre, início e fim do mandato ou indeterminado, aviso de mandato vencido. Opção de somar os 120 dias de prorrogação automática (a data final vai no texto). Avisa quando o substabelecimento passa do prazo de quem substabeleceu e quando, em S/A, a procuração está sem prazo (vai até o fim do mandato da diretoria) |
| 3 | **Documentos** | Recebidos na proposta e de apoio (data e origem: Busca Ai, Junta Comercial, Sharefiche 1/2, proposta anterior ou outro). Tipos incluem Ata de Eleição e Ata de Autorização. Documento utilizado pode ser marcado como "Retirado da JUCESP" (vai no texto e entra na lista de anexos). Junta Comercial já marca "anexado na proposta" |
| 4 | **Garantidor** | Sim/Não + data da base (já vem com a data padrão da base de garantias). Com a planilha de referência carregada, mostra o quórum de garantias do tipo societário |
| 5 | **Filiais** | Colar vários CNPJs de uma vez (mesmo com agência, conta e outros dados junto: só os CNPJs entram), marcar "coube / não coube réplica" em lote, lista organizada automaticamente |
| 6 | **Anotações** | Campo livre: formas de assinatura, quóruns e observações. Com a planilha carregada, digitar um código de autorização (ex.: `A02` e espaço) escreve o texto por extenso. No fim, **Tem alinhamento?** (Sim/Não): no Sim, o texto do alinhamento entra no texto final |

Só uma etapa fica aberta por vez; as fechadas mostram um resumo do que já foi preenchido.

### 🔒 Proteções contra esquecimento
- **Procuração particular:** a cópia do texto fica **bloqueada** até confirmar a validação (ITI ou outro meio).
- **Conferência de anexos:** antes de copiar ou finalizar, uma lista curta pede para confirmar que você anexou a validação, os documentos da Junta e as evidências.
- **Faixa "Falta anexar"** no topo enquanto houver anexo pendente.
- **Lembrete ao sair** (opcional): notificação do Windows se você trocar de tela com anexo pendente.
- **Checklist clicável:** cada pendência leva direto ao campo.
- **Revisão antes de finalizar:** uma tela com tudo o que foi preenchido de um lado e o texto final do outro, mostrando o que está em branco.

### ⚡ Para ir mais rápido
- **Texto final pronto** no modelo do time, com botão **Copiar** (e copiar por partes: só grupos, documentos ou filiais).
- **Finalização pronta:** a aba **Finalização** monta a observação para o cliente ("Cadastro de poderes conforme…") e o follow-up (grupos, documentos, filiais replicadas, garantidor, razão social, prorrogação) com o que já foi preenchido.
- **Respostas prontas** (<kbd>Alt</kbd>+<kbd>R</kbd>): os textos de pendência e devolução da planilha de referência, com busca e com os dados da anotação já preenchidos; o que falta fica marcado.
- **Respostas sugeridas:** o bloco olha a anotação e sugere a resposta certa (mandato vencido, falta contrato ou ata de eleição, documento já usado na análise anterior, procuração não validada, fundo).
- **Procuração que não validou:** escolha como foi assinada (D4Sign, Clicksign, DocuSign, Certisign…) e marque "Não foi possível validar"; a pendência daquela plataforma abre pronta.
- **Colar inteligente:** aperte <kbd>Ctrl</kbd>+<kbd>V</kbd> fora dos campos e o bloco descobre o que é (CNPJ, vários CNPJs → filiais, nº da proposta, razão social, data → pergunta o campo).
- **Data rápida:** digite `010524` → 01/05/2024. Também aceita `hoje` e `ontem`.
- **Teclado:** <kbd>Enter</kbd> vai para o próximo campo, <kbd>Ctrl</kbd>+<kbd>Enter</kbd> para a próxima etapa, letras escolhem opções (<kbd>S</kbd>/<kbd>N</kbd>).
- **Reaproveitar análise:** se o CNPJ já tem uma análise anterior, oferece copiar grupos, documentos e filiais.
- **Janela flutuante:** botão **Destacar** abre o bloco numa janelinha que fica por cima do Salesforce, PDF etc.
- **Comparar com a análise anterior:** em cliente recorrente, mostra o que mudou (grupo novo, mandato diferente, filiais novas…).
- **Modelo do texto editável:** o próprio analista muda a ordem, os rótulos e as frases do texto final, e pode exportar o modelo para o time.
- **Modo foco:** esconde a lista e o painel e mostra só a etapa atual, com uma barra de etapas no topo.

### 🗂️ Organização
- Situação da anotação: **Em análise · Em aguardo · Finalizada**, com abas na lista lateral.
- **Lixeira** de 30 dias, com restaurar e excluir de vez.
- **Ctrl+Z / Ctrl+Y** para desfazer e refazer qualquer alteração.
- **Nota rápida** em cada etapa, para lembretes que não entram no texto final.
- Busca por CNPJ, proposta ou nome.
- **Backup** em arquivo (exportar / importar).
- Modo **claro e escuro**.

### 📑 Planilha de referência (fica só no seu computador)
No rodapé da lista lateral, **Planilha de referência** carrega o arquivo `.xlsx` de referência de poderes que o time já usa. O bloco lê o arquivo no próprio navegador e passa a mostrar:

- as **respostas prontas** de pendência e devolução;
- o **quórum de garantias** por tipo societário;
- os **códigos de autorização** por extenso nas Anotações;
- o **link da Junta Comercial** do estado nos documentos de apoio.

A planilha é material interno: **não fica neste repositório**, não é enviada para a internet e não entra no backup das anotações. Cada pessoa carrega a sua e, quando sair versão nova, é só carregar de novo.

---

## 🚀 Como usar

### Usar online
👉 **[diogotex0.github.io/bloco-de-notas-tcs](https://diogotex0.github.io/bloco-de-notas-tcs/)**

Abre direto no navegador. As anotações ficam salvas só no seu computador.

### Usar offline (sem instalar nada)
1. Baixe o arquivo [`dist-portatil/index.html`](dist-portatil/index.html).
2. Dê dois cliques. Ele abre no navegador e funciona **offline**.
3. Clique em **Ver um exemplo** para conhecer tudo com dados fictícios.

> 💡 Crie um atalho na área de trabalho para esse arquivo.

### Para desenvolver
Precisa do [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
npm install
npm run dev              # abre em http://localhost:5173
npm run build:portatil   # gera dist-portatil/index.html (um arquivo só)
```

---

## ⌨️ Atalhos

| Atalho | O que faz |
|---|---|
| <kbd>Alt</kbd>+<kbd>N</kbd> | Nova anotação |
| <kbd>Alt</kbd>+<kbd>C</kbd> | Copiar o texto final |
| <kbd>Alt</kbd>+<kbd>R</kbd> | Respostas prontas |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Buscar anotação |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Desfazer / refazer |
| <kbd>Alt</kbd>+<kbd>M</kbd> | Modo foco |
| <kbd>Enter</kbd> | Próximo campo |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Próxima etapa |
| <kbd>S</kbd> / <kbd>N</kbd> (e setas) | Escolher a opção selecionada |
| <kbd>Ctrl</kbd>+<kbd>V</kbd> (fora de campo) | Colar inteligente |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (nas filiais) | Adicionar os CNPJs colados |

---

## 🔐 Privacidade

- **Nada é enviado para a internet.** As anotações ficam salvas só no navegador de quem usa (`localStorage`).
- Não há login, servidor nem banco de dados.
- Fontes e bibliotecas vão embutidas no arquivo; a página não faz nenhuma requisição externa.
- O único link externo é o botão **Receita**, que abre a consulta pública de CNPJ quando você clica.
- **Use só dados fictícios** em testes e demonstrações.

---

## 🧱 Como é feito

| | |
|---|---|
| Interface | React 19 + TypeScript |
| Estilo | Tailwind CSS 4, com tokens de cor para tema claro e escuro; fontes do sistema (nada para baixar) |
| Animações | Motion |
| Estado | Zustand (+ Immer), salvo no `localStorage` com validação dos dados |
| Ícones | Lucide |
| Build | Vite (+ versão portátil em arquivo único) |

```
src/
├── lib/            regras: CNPJ, datas, pendências, texto final, anexos, colar inteligente, teclado
├── store/          estado e salvamento (anotações, interface, avisos)
└── components/
    ├── sections/   uma tela para cada etapa
    ├── MiniApp     versão compacta da janela flutuante
    └── ...         barra lateral, painel de pendências, diálogos
```

---

## 🗺️ Próximos passos

- [ ] Tour de boas-vindas e colinha de atalhos dentro do bloco
- [ ] Biblioteca de textos prontos (quóruns e autorizações)
- [ ] Backup automático numa pasta
- [ ] Extensão de navegador que lê CNPJ e nº da proposta da página do Salesforce
- [ ] Integração oficial (depende de liberação)

---

<div align="center">
Feito para facilitar o dia a dia da análise de poderes. 💙
</div>
