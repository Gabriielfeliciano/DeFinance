# DeFinance — Carteiras Solana

**Data:** 2026-10-29
**Status:** Aprovado

## 1. Intenção

Hoje o DeFinance só entende endereços EVM (`0x…`). Quem também tem fundos na
Solana precisa olhar em outro lugar e somar de cabeça. Esta iteração deixa o
usuário colar um **endereço Solana** no mesmo campo de sempre e ver o saldo de
**SOL e dos tokens SPL somado ao portfólio**, junto com as carteiras EVM.

Sai do backlog o item "Carteiras Solana" (Starknet e Tron continuam lá).

Contexto de futuro (dito pelo usuário): mais pra frente ele quer mostrar
**posições em plataformas de stake**, tanto em EVM quanto em Solana. Não entra
agora, mas o desenho não deve fechar essa porta (ver §9).

## 2. Objetivos

- Aceitar um endereço Solana (base58) no mesmo campo dos endereços EVM, com
  detecção automática do formato.
- A carteira Solana vira um cartão igual aos outros e **conta dentro do limite
  de 3 carteiras** (decidido pelo usuário: "tudo junto").
- SOL e tokens SPL entram na lista de tokens, no gráfico, no total e no valor
  do cartão.
- "Solana" aparece como mais um chip no filtro de rede (só quando há tokens
  nela, como as outras redes).
- Dados via **Alchemy** (decidido pelo usuário).

## 3. Fora do escopo (não-objetivos)

- **SOL em stake / liquid staking como posição** e qualquer plataforma de
  stake (EVM ou Solana): fica para uma iteração futura. Tokens de liquid
  staking que são SPL comuns (mSOL, jitoSOL…) aparecem normalmente se a
  Alchemy der preço, como qualquer token; o que não entra é SOL delegado em
  stake accounts.
- NFTs (inclusive compressed NFTs).
- Posições DeFi (liquidez, lending).
- Conectar carteira (Phantom etc.): continua 100% somente leitura.
- Nomes `.sol` (SNS), equivalente ao ENS.
- Starknet e Tron.

## 4. Anti-objetivos (seria falha mesmo funcionando)

- Quebrar ou deixar mais lento qualquer coisa das carteiras EVM.
- Endereço Solana virar outro endereço por causa de `toLowerCase()`: base58
  diferencia maiúsculas de minúsculas. Um endereço Solana minusculizado é
  outra carteira (ou inválido).
- Encher a lista de spam: a Solana tem muito token SPL sem valor.
- O app pedir qualquer coisa além do endereço público.

## 5. Como fica na tela

Nada novo de layout. O que muda:

- Campo de endereço: placeholder inicial passa de `0x…` para algo que deixe
  claro que Solana também vale (ex.: `Endereço EVM (0x…) ou Solana`).
- Cartão da carteira Solana: endereço curto com os **4 primeiros e 4 últimos**
  caracteres (`7xKX…gAsU`), já que não há prefixo `0x`.
- Chip "Solana" no filtro, na última posição.
- Mensagem de erro de endereço inválido passa a citar os dois formatos (ex.:
  "Endereço inválido. Use um endereço EVM (0x…) ou Solana.").

## 6. Regras de comportamento

Decididas pelo usuário:

- Mesmo campo, detecção automática, até 3 carteiras no total entre EVM e
  Solana.
- Dados da Alchemy.

Calls minhas (revisadas em chat):

- **Validação Solana:** base58 (alfabeto sem `0`, `O`, `I`, `l`), 32 a 44
  caracteres, e decodifica para exatamente 32 bytes. Feita no navegador e de
  novo no servidor, num validador em `shared/address.ts` ao lado do EVM. Uma
  função que diga o tipo do endereço (`'evm' | 'solana' | null`) é a forma
  natural.
- **Rota única:** `/api/tokens?address=…` continua sendo a única rota. O
  servidor detecta o tipo: endereço EVM consulta as 17 redes EVM como hoje;
  endereço Solana consulta **só a Solana**. O formato da resposta
  (`TokensResponse`) não muda.
- **Rede no modelo:** `solana` vira mais um `ChainId` (label "Solana"), mas
  separado das redes EVM: o servidor precisa saber quais redes consultar para
  cada tipo de endereço. Sugestão: manter uma lista de redes EVM e acrescentar
  a Solana à lista de todas as redes usada pelo filtro.
- **Token nativo:** SOL, 9 casas decimais (as EVM usam 18; hoje o 18 está fixo
  no mapper e no handler). Nome "Solana", símbolo "SOL", logo da CoinGecko.
  Se a Alchemy não mandar o preço do SOL, usar o mesmo caminho de hoje
  (Prices API por símbolo).
- **Spam e poeira:** mesmas regras das EVM. Sem preço, sem metadados ou abaixo
  de US$ 0,01 fica de fora.
- **Logos:** os que faltarem vêm da lista pública da CoinGecko
  (`tokens.coingecko.com/solana/all.json`), como nas outras redes. Se essa
  lista não existir ou mudar de formato, o token fica com as iniciais, como
  hoje.
- **Endereços de mint (contratos SPL) são case-sensitive.** O `id` do token
  fica `solana:<mint exatamente como veio>`, e o índice de logos e preços da
  Solana compara sem minusculizar.
- **Duplicata:** carteira EVM continua comparada em minúsculas; Solana é
  comparada exatamente como foi digitada (sem `toLowerCase`).
- **Falha:** se a Solana não responder, a carteira Solana vira erro (é a única
  rede dela), com o "Tentar novamente" do cartão e o aviso de carteira que já
  existem. Mesmo timeout de 15 s e mesmo cache de 60 s na CDN.

## 7. Validação contra a API real (primeiro passo)

A documentação da Portfolio API (`assets/tokens/by-address`) diz que cobre
"native, ERC-20 and SPL" e cita a Solana, mas não traz exemplo nem o slug da
rede. Antes de escrever o mapeamento, quem implementar faz chamadas reais com
uma carteira Solana pública conhecida e confirma:

1. O slug da rede (provavelmente `solana-mainnet`).
2. Como vem o SOL nativo (`tokenAddress` nulo? metadados nulos? decimais?).
3. Se os SPL vêm com `tokenMetadata` (símbolo, decimais, logo) e
   `tokenPrices`.
4. Se a paginação (`pageKey`) funciona igual.
5. Se a Prices API aceita `solana-mainnet` por endereço de mint, caso os SPL
   venham sem preço (no mesmo esquema do `erc20PricesByAddress` da Robinhood
   Chain).

A resposta real vira fixture de teste em `server/__fixtures__/`, como foi com
as redes EVM.

**O que dá para contornar sem voltar ao usuário** (call minha):

- SPL sem preço na Portfolio API, mas com preço na Prices API por mint: usar a
  Prices API, no mesmo esquema do `erc20PricesByAddress`.
- SPL sem metadados (símbolo/decimais): completar com a lista da CoinGecko
  Solana (`symbol`, `name`, `decimals`). Continua sem metadados por nenhuma das
  duas fontes = fica de fora, como hoje.
- SOL nativo ausente na Portfolio API: uma única chamada RPC `getBalance` da
  Alchemy para o SOL, com o preço vindo da Prices API por símbolo.

**Parar e voltar ao usuário** só se a Portfolio API não listar os tokens SPL
de jeito nenhum (seria preciso partir para `getTokenAccountsByOwner`/DAS), ou
se nenhuma API da Alchemy der preço aos SPL. Isso muda o tamanho do trabalho.

**Pré-requisito:** a chave da Alchemy não está no repositório local. O
usuário precisa fornecer uma (ex.: `vercel env pull`) e confirmar que a
Solana está habilitada no app da Alchemy, antes da etapa de validação.

## 8. Restrições

- Angular standalone + Signals, mesmo padrão do MVP e da multi-carteira.
- Testes no mesmo estilo dos `*.spec.ts` atuais (Vitest, jsdom no front, Node
  no servidor). Cobrir: validação base58 (válido, inválido, tamanho,
  maiúsculas preservadas), detecção do tipo, handler escolhendo as redes
  certas, mapeamento do SOL com 9 decimais, mint case-sensitive no `id`,
  duplicata Solana sem minusculizar.
- A chave da API continua só no servidor e redigida dos erros.
- Modo `mock` ganha pelo menos um endereço Solana com SOL e alguns SPL
  (incluindo USDC), para testar manualmente a mistura EVM + Solana.
- Nenhuma dependência nova só para base58: um decodificador pequeno local
  basta. (Se quem implementar achar que uma lib vale a pena, justificar.)

## 9. Deixado para quem implementar

- Estrutura exata da separação EVM/Solana em `shared/token.ts` e
  `server/chains.ts` (ex.: `ChainConfig` ganhar `decimals` do nativo e um
  campo de família/tipo).
- Se o cliente da Alchemy recebe o endereço já normalizado (minúsculo para
  EVM, intacto para Solana) ou faz isso ele mesmo.
- Nome da função de detecção e mensagens exatas de erro/placeholder.
- **Sem juntar USDC Solana com USDC EVM:** o `id` inclui a rede, então ficam
  linhas separadas na lista, como já acontece entre redes EVM. O gráfico já
  junta o mesmo ativo em redes diferentes numa fatia; conferir que SOL/USDC
  da Solana entram nessa regra do mesmo jeito.
- Preparar para stake no futuro só no sentido de não amarrar o código a "uma
  carteira = só tokens"; não criar abstração nenhuma para isso agora.
- Atualizar `README.md` (funcionalidades, diagrama, "17 redes EVM" → incluir
  Solana) e remover Solana do item de `docs/backlog.md`. Acrescentar ao
  backlog: "Plataformas de stake (EVM e Solana)".
