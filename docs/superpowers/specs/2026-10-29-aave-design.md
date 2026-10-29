# DeFinance — Posições na Aave v3 (lending/borrowing)

**Data:** 2026-10-29
**Status:** Aprovado

## 1. Intenção

Hoje o DeFinance conta os depósitos na Aave, porque os aTokens (`aEthWBTC`…)
chegam da Alchemy com preço, mas ignora a dívida: os tokens de dívida
(`variableDebt…`) vêm sem preço e caem no filtro de spam. Para quem tem
empréstimo, o total fica **inflado**. Exemplos reais de 2026-10-29:

| Carteira | DeFinance mostra | Patrimônio líquido real |
|---|---|---|
| `0x970a959ff873efe333f0153b1cdcac853f41c425` | US$ 245 mil | US$ 94 mil (dívida US$ 151 mil, HF 1,38) |
| `0x5ac88d99758acdc8d7149c58c42dfbe2f6ee91a5` | US$ 46 mil | US$ 8,5 mil (HF 1,05) |

Esta iteração mostra as posições na Aave v3 (**depositado, emprestado e
health factor**) e faz o valor total virar **patrimônio líquido**, com a
dívida descontada.

É o primeiro passo de "posições DeFi" do backlog. Stake (EVM e Solana) e
outros protocolos de lending ficam para depois.

## 2. Objetivos

- Mostrar, para cada carteira EVM, as posições na Aave v3 em todas as redes
  EVM que o DeFinance já cobre: o que está depositado, o que está emprestado
  e o health factor de cada mercado.
- Valor total = patrimônio líquido (carteira + depositado − emprestado),
  inclusive no valor de cada cartão de carteira.
- Nunca contar um depósito duas vezes (aToken na lista + depósito na Aave).

## 3. Fora do escopo (não-objetivos)

- Outros protocolos de lending (Compound, Spark, Morpho; Kamino/marginfi na
  Solana). Decidido pelo usuário: só Aave v3, só EVM.
- Aave v2 e Aave v4.
- Stake/liquid staking como posição.
- APY, rendimento acumulado, histórico, simulação de health factor,
  alertas de liquidação.
- Qualquer ação (depositar, sacar, pagar): continua somente leitura.
- Redes que o DeFinance não cobre, mesmo que a Aave esteja lá.

## 4. Anti-objetivos (seria falha mesmo funcionando)

- Contar o mesmo depósito duas vezes.
- Uma falha da Aave derrubar ou esconder o resto do painel.
- Mostrar health factor errado ou "verde" quando a posição está perto de
  liquidar. Melhor não mostrar do que mostrar errado.
- Deixar mais lenta a carteira de quem não usa Aave.

## 5. Como fica na tela (decidido com o usuário: opção A, "seção própria")

```
[ cartões de carteira — valor de cada uma já líquido ]
(Todas) (Ethereum) (Base) …                      ← filtro de rede

┌ Patrimônio líquido ──────────────┐ ┌ gráfico ┐
│ US$ 94.584                       │ │         │
│ Carteira US$ 146 · Aave          │ │         │
│ depositado US$ 245.064 ·         │ │         │
│ dívida −US$ 150.626              │ │         │
└──────────────────────────────────┘ └─────────┘

┌ Aave · Ethereum              [Health factor 1,38] ┐
│ Depositado   WBTC 2,41 · US$ 245.064             │
│ Emprestado   USDC 150.626 · US$ 150.626          │
└──────────────────────────────────────────────────┘

┌ Tokens na carteira ─┐
│ USDC · US$ 139      │
│ ETH  · US$ 7        │
└─────────────────────┘
```

Mockup aprovado: `.superpowers/brainstorm/798-1793301393/content/aave-layout.html`
(opção A).

## 6. Regras de comportamento

Decididas pelo usuário:

- Só Aave v3, nas redes EVM já cobertas.
- Total = patrimônio líquido.
- Seção própria da Aave abaixo do resumo e do gráfico, acima da lista de
  tokens, mostrando depositado, emprestado e health factor.

Calls minhas, aprovadas na revisão em chat:

- **Resumo:** quando existe posição na Aave (nas carteiras ligadas e no
  filtro atual), o rótulo é "Patrimônio líquido" e a legenda mostra a
  composição: `Carteira US$ X · Aave depositado US$ Y · dívida −US$ Z`.
  Sem posição na Aave, o resumo fica exatamente como hoje.
- **Um cartão por mercado** com posição (ex.: "Aave · Ethereum",
  "Aave · Base"; mercados extras da mesma rede usam o nome da Aave, como
  "Aave · Ethereum Lido"). Cada cartão lista depositados e emprestados
  (símbolo, quantidade, valor em USD), maiores primeiro.
- **Com mais de uma carteira adicionada**, o cartão mostra a carteira curta
  (`0x970a…c425`). Cartões não se somam entre carteiras: cada carteira tem o
  próprio health factor em cada mercado.
- **Health factor:** duas casas decimais. Cores: < 1,1 vermelho;
  1,1 a 1,5 amarelo; > 1,5 verde. Sem empréstimo no mercado, não aparece
  (a Aave devolve `null`). Valor muito alto (ex.: > 100) aparece como
  "> 100" (call minha, para não mostrar números gigantes).
- **Sem contagem dupla:** os aTokens saem da lista de tokens; o depósito
  aparece só no cartão da Aave.
- **Gráfico:** depósitos entram como o ativo original (WBTC, não aEthWBTC),
  somados com o mesmo ativo na carteira pela regra atual (mesmo símbolo =
  mesma fatia). A dívida **não** entra no gráfico.
- **Filtro de rede** vale para a seção da Aave também (o mercado pertence a
  uma rede). O contador de cada chip passa a contar também os cartões da
  Aave daquela rede (call minha: um chip não pode sumir se a rede só tem
  posição na Aave).
- **Cartões de carteira:** o valor de cada carteira passa a ser líquido.
- **Carteira Solana:** sem seção da Aave, sem consulta à Aave.
- **Falha da Aave:** aviso no mesmo estilo dos atuais: "Não foi possível
  carregar as posições da Aave. O total pode estar incompleto.", com
  "Tentar novamente". Nesse caso a carteira volta ao comportamento de hoje
  (aTokens na lista, contando como ativo), porque sem a Aave não se sabe a
  dívida, e esconder os depósitos pioraria o total. O resultado parcial não
  vai para o cache da CDN, como já acontece com rede que falha.
  **Qualquer** chamada à Aave que falhe para a carteira (lista de mercados,
  depósitos, empréstimos ou health factor de algum mercado) conta como falha
  da Aave inteira para aquela carteira (call minha: um health factor que
  faltou não pode virar "sem empréstimo", e meia posição daria um total
  errado).
- **Patrimônio líquido negativo** (raro: exigiria uma posição já
  liquidável, ou um colateral sem preço) aparece negativo, sem arredondar
  para zero.
- **Mercados:** todos os mercados v3 que a Aave lista nas redes do
  DeFinance, inclusive os quatro da Ethereum. Sem filtro de mercado
  congelado ou permissionado: se a carteira tem posição, ela aparece.
- **Estado vazio:** uma carteira com posição na Aave e nada solto na carteira
  não é "vazia".

## 7. Fonte dos dados (call minha, pesquisada em 2026-10-29)

**API GraphQL oficial da Aave**, `https://api.v3.aave.com/graphql`, sem
chave. Testado de verdade:

- `markets(request: { chainIds: [...] })` lista os mercados v3 por rede
  (Ethereum tem quatro: AaveV3Ethereum, AaveV3EthereumLido,
  AaveV3EthereumEtherFi, AaveV3EthereumHorizon).
- `userSupplies` e `userBorrows` aceitam **vários mercados de várias redes
  numa chamada só** e devolvem moeda (símbolo, endereço do ativo original),
  quantidade, valor em USD e `isCollateral`. ~200 ms.
- `userMarketState(request: { market, user, chainId })` dá `healthFactor`,
  `netWorth`, `totalCollateralBase`, `totalDebtBase`, **um mercado por
  chamada**. Só precisa ser chamado nos mercados com empréstimo.

Fica no servidor (a função do Vercel), como a Alchemy: o navegador continua
falando só com `/api/tokens`. Para endereço EVM, o servidor consulta a Aave
em paralelo com a Alchemy, então quem não usa Aave não espera mais por isso
(a latência é a maior das duas).

Ler os contratos (`UiPoolDataProvider`) via RPC da Alchemy foi descartado:
mesmo resultado, muito mais código (preços, decimais, cálculo do health
factor).

## 8. Validação contra a API real (primeiro passo)

Antes de escrever o mapeamento, quem implementar confirma com chamadas reais
(as carteiras da §1 servem):

1. Os campos exatos de `userSupplies`, `userBorrows`, `userMarketState` e
   `markets` no schema atual (há playground no próprio endpoint).
2. Os endereços dos aTokens de cada mercado, para tirá-los da lista de
   tokens. O schema já tem o caminho (introspecção em 2026-10-29):
   `markets { reserves { underlyingToken { address symbol } aToken { address } vToken { address } } }`.
   Confirmar que bate com os aTokens que a Alchemy devolve (ex.: `aEthWBTC`
   da carteira `0x970a…c425`). Sem heurística por nome ou símbolo.
   O tipo `Market` também tem `userState`, que pode trazer o health factor
   de todos os mercados numa chamada só: se trouxer, usar no lugar de um
   `userMarketState` por mercado.
3. Quais mercados existem nas redes do DeFinance (o `chainId` de cada rede
   EVM do app).
4. Se a resposta respeita o caso do endereço do usuário (checksum ou
   minúsculas).
5. Limites de uso, se a API informar algum.

As respostas viram fixture de teste em `server/__fixtures__/`.

## 9. Restrições

- Mesmos padrões do projeto: Angular standalone + Signals, Vitest, funções
  serverless em `server/`, tipos compartilhados em `shared/`.
- A rota continua sendo uma só: `/api/tokens`. Mesmo timeout de 15 s no
  navegador. Cache na CDN: igual ao de hoje (60 s +
  `stale-while-revalidate=300`) quando a carteira não tem empréstimo na
  Aave; **`public, s-maxage=15` sem `stale-while-revalidate`** quando tem
  (call minha: o health factor de quem está perto de liquidar não pode ter
  minutos de atraso).
- Somente leitura, sem chave nova (a API da Aave não pede).
- Testes no estilo atual, cobrindo: soma líquida, aTokens fora da lista,
  health factor `null`, cores nos limites (1,1 e 1,5), falha da Aave caindo
  no comportamento de hoje, filtro de rede, multi-carteira.
- Modo `mock` ganha pelo menos: uma carteira com depósito e dívida em dois
  mercados (HF amarelo e verde), uma perto de liquidar (HF vermelho) e uma
  com a Aave fora do ar.

## 10. Deixado para quem implementar

- O formato exato do campo novo em `TokensResponse` (ex.: `lending` com
  mercados, depósitos e dívidas, e um sinalizador de falha da Aave), desde
  que a resposta antiga continue sendo lida (resposta sem o campo = sem
  Aave, como no `failedChains` da multi-carteira).
- Se o servidor já manda `totalValueUsd` líquido ou se o navegador calcula a
  partir das partes (o filtro de rede e a multi-carteira provavelmente pedem
  o cálculo no navegador).
- Cache em memória da lista de mercados, como as listas de logos.
- `chainId` numérico de cada rede no `ChainConfig`.
- Nome e estrutura dos componentes novos.
- Atualizar `README.md` e `docs/backlog.md` (posições DeFi: lending feito
  com Aave v3; stake e outros protocolos continuam no backlog).
