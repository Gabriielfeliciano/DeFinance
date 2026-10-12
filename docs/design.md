# DeFinance — Design Doc (MVP)

**Data:** 2026-10-12
**Autor:** Gabriel (brainstorm com Claude Code)
**Status:** Aprovado para implementação

## 1. Visão do produto

DeFinance é uma versão simplificada e moderna do DeBank: o usuário cola o
endereço público de uma carteira cripto (somente leitura — nunca pede chave
privada, nunca conecta wallet) e o app mostra:

1. Lista de tokens com quantidade, preço unitário e valor em USD
2. Valor total da carteira em destaque
3. Gráfico de pizza com a distribuição percentual por ativo

Objetivo: peça de portfólio para apresentar a clientes de freelance no
universo cripto/fintech. Precisa ser bonita, rápida de entender e com demo
pública no ar. Orçamento de implementação: ~4 sessões de 1 hora.

## 2. Decisões técnicas

| Decisão | Escolha | Por quê |
|---|---|---|
| Redes suportadas | Ethereum + Arbitrum + Base | Cobre o ecossistema atual (L2s) sem explodir escopo nem rate limit |
| API de saldo/preço | Alchemy (Token API + Prices API + Spam List) | Marca forte para citar a clientes fintech; free tier generoso (300M CU/mês) |
| Tokens de spam/sem preço | Filtrar e esconder | Demo precisa de impacto visual limpo; sem preço quase sempre = spam/morto |
| Proteção da API key | Serverless function no Vercel (`/api/tokens`) como proxy | Key nunca sai do servidor; zero infraestrutura extra (mesma plataforma de deploy) |
| Lib de gráfico | ApexCharts (`ng-apexcharts`) | Visual "produto fintech" de cara, pouca configuração |
| Estrutura de componentes | Container + presentational | Separação limpa — repo pode ser mostrado a clientes como prova de capacidade técnica |
| Estado | Angular Signals em `WalletService` | Idiomático no Angular atual, zero lib extra, suficiente para o tamanho do app |
| Erro/loading | Status signal centralizado (`idle/loading/success/empty/error`) | Poucos estados possíveis; dá sensação de app "produto" com skeleton + retry |
| Moeda | Só USD no MVP; EUR vai para o backlog | Corta uma chamada/conversão extra sem perder o core da demo |

## 3. Arquitetura

- Angular standalone (versão estável mais recente), sem back-end tradicional
- 1 serverless function no Vercel (`/api/tokens`) recebe o endereço, chama a
  Alchemy em paralelo (`Promise.all`) para as 3 chains — Token Balances,
  Token Metadata, Prices e Spam List — filtra spam e tokens sem preço, e
  devolve um JSON já limpo e consolidado
- O front nunca guarda nem expõe a API key da Alchemy
- `WalletService` (signals) consome `/api/tokens` e expõe `status`,
  `tokens`, `totalValueUsd`
- `DashboardComponent` orquestra os componentes presentacionais

Fluxo: usuário cola endereço → validação de formato (regex, síncrona,
client-side) → `WalletService` chama o proxy → proxy agrega as 3 chains na
Alchemy → front recebe lista limpa → signals atualizam → UI renderiza lista
+ total + gráfico de pizza.

## 4. Contrato de dados

```ts
interface TokenItem {
  chain: 'ethereum' | 'arbitrum' | 'base';
  symbol: string;
  name: string;
  logoUrl?: string;
  balance: number;       // já convertido de decimals
  priceUsd: number;
  valueUsd: number;      // balance * priceUsd
}
```

`GET /api/tokens?address=0x...` devolve:

```ts
{ tokens: TokenItem[], totalValueUsd: number }
```

Já filtrado (sem spam, sem preço zero) e já somado — o front não recalcula
nada pesado, só exibe.

## 5. Componentes

- **`WalletInputComponent`** — input + validação regex
  (`^0x[a-fA-F0-9]{40}$`), emite endereço válido para o pai; endereço
  inválido nunca chega a chamar `/api/tokens`
- **`DashboardComponent`** — injeta `WalletService`, dispara o fetch no
  submit, passa signals para os filhos via input signal
- **`PortfolioSummaryComponent`** — recebe `totalValueUsd`, mostra número
  grande formatado
- **`TokenListComponent`** — recebe `tokens[]`, lista com
  logo/símbolo/quantidade/preço/valor, ordenada por valor desc
- **`PortfolioChartComponent`** — recebe `tokens[]`, calcula % client-side,
  monta série para o ApexCharts

## 6. Estados de erro/loading

`WalletService` expõe
`status: signal<'idle' | 'loading' | 'success' | 'empty' | 'error'>`:

- **`idle`** — tela inicial, só o input, instrução curta
- **`loading`** — skeleton no lugar de lista/total/gráfico
- **`error`** — banner curto + botão "tentar novamente" (rechama o fetch
  com o mesmo endereço); cobre falha de rede, rate limit, erro 5xx do proxy
- **`empty`** — carteira válida mas sem tokens com valor de mercado →
  mensagem amigável em vez de tela vazia
- Validação de formato do endereço é síncrona e acontece antes de tudo —
  erro inline no próprio input

## 7. Plano de sessões (1h cada)

**Sessão 1 — Setup + input + 1º deploy**
`ng new` standalone, instala `ng-apexcharts`, `WalletInputComponent` com
validação regex, shell básico, deploy no Vercel.
*Visível: URL pública no ar, valida formato de endereço.*

**Sessão 2 — Proxy + dados reais**
`/api/tokens` serverless (chamadas Alchemy em paralelo pras 3 chains, já
filtra spam/sem-preço), `WalletService` com signals, `TokenListComponent`
simples sem estilo refinado.
*Visível: cola endereço real, vê lista real de tokens.*

**Sessão 3 — Total + gráfico + polish essencial**
`PortfolioSummaryComponent`, `PortfolioChartComponent` (pizza ApexCharts),
passada rápida de estilo (cor/espaçamento/fonte, nada elaborado).
*Visível: fluxo MVP completo e apresentável.*

**Sessão 4 — Erros + robustez + polish final**
Estados idle/loading/empty/error com skeleton+retry, testa edge cases
(endereço errado, carteira vazia), polish final se sobrar tempo, README
curto, deploy final.
*Visível: demo robusta, pronta pra mandar link pra cliente.*

## 8. Riscos e corte de escopo

O maior risco é a Sessão 2 (integração 3-chain com Alchemy é a parte
desconhecida — se as chamadas em paralelo ou o shape da resposta surpreender,
pode estourar a hora). Se atrasar, corta-se primeiro o polish visual da
Sessão 3 (fica limpo mas simples, sem refino), nunca a robustez da
Sessão 4 — para uma demo de cliente, não travar importa mais que estar
bonito.

## 9. Backlog

Itens fora do MVP, registrados em [`backlog.md`](./backlog.md).
