# DeFinance

**Veja quanto vale uma carteira cripto em segundos, sem conectar nada.**

DeFinance é um painel de portfólio somente leitura para carteiras EVM e Solana. Você cola o endereço público de até 3 carteiras e o app mostra os tokens, o valor total em dólar e a distribuição por ativo em **17 redes EVM e Solana**, de Ethereum, Arbitrum e Base a Polygon, BNB Chain, Avalanche e Solana, tudo em uma tela.

### 👉 [Abrir a demo ao vivo](https://de-finance-psi.vercel.app)

Para testar, use a carteira pública de Vitalik Buterin, cofundador do Ethereum:

```
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

![Painel do DeFinance com o valor total, o gráfico de distribuição e a lista de tokens de uma carteira](docs/screenshots/desktop-dark.png)

<p align="center">
  <img src="docs/screenshots/desktop-light.png" alt="DeFinance no tema claro" width="68%" />
  <img src="docs/screenshots/mobile-dark.png" alt="DeFinance no celular" width="28%" />
</p>

---

## Funcionalidades

- **Visão consolidada de 17 redes EVM:** Ethereum, Arbitrum, Base, Optimism, Polygon, BNB Chain, Avalanche, zkSync, Linea, Scroll, Berachain, Zora, Unichain, Shape, Monad, HyperEVM e Robinhood Chain, consultadas em paralelo e somadas em um único resultado.
- **Carteiras Solana:** SOL e tokens SPL, no mesmo campo das carteiras EVM. O app reconhece o formato do endereço sozinho, e a carteira Solana conta dentro do limite de 3. Endereços Solana distinguem maiúsculas de minúsculas, então são mantidos exatamente como colados.
- **Posições na Aave v3:** para carteiras EVM, o app mostra o que foi depositado e o que foi emprestado em cada mercado da Aave, com o health factor (cores de alerta perto da liquidação). Com posição na Aave, o valor total vira **patrimônio líquido** (tokens + depositado − emprestado), e os aTokens deixam de aparecer duplicados na lista.
- **Valor total em destaque**, em USD.
- **Gráfico de distribuição:** o mesmo ativo em redes diferentes vira uma fatia só, e os ativos menores são agrupados em "Outros" para o gráfico continuar legível.
- **Lista de tokens** com quantidade, preço unitário e valor, ordenada do maior para o menor.
- **Até 3 carteiras somadas:** cada carteira vira um cartão com o próprio valor e uma caixa para incluir ou tirar da soma. O mesmo token em carteiras diferentes vira uma linha só. Se uma carteira falhar, as outras continuam aparecendo e um aviso diz qual ficou de fora. Nada é salvo: recarregar a página começa do zero.
- **Filtro por rede**, só com as redes onde a carteira tem tokens e a contagem de cada uma.
- **Filtro automático de spam:** tokens sem preço de mercado, sem dados ou com valor abaixo de US$ 0,01 não aparecem.
- **Tema claro e escuro:** segue o sistema na primeira visita e lembra a escolha depois.
- **Estados bem resolvidos:** esqueleto animado enquanto carrega, mensagem clara para carteira vazia, aviso nomeando as redes que não responderam e botão "Tentar novamente" quando algo falha.
- **Responsivo:** funciona no celular sem rolagem horizontal.

## Segurança e privacidade

- **Somente leitura.** O app só recebe o endereço público. Nunca pede chave privada, frase de recuperação ou conexão de carteira, e não existe nenhuma forma de movimentar fundos por ele.
- **A chave da API fica no servidor.** O navegador fala apenas com o servidor do próprio DeFinance, e é ele quem consulta o provedor de dados. A chave nunca chega ao navegador e é removida de qualquer mensagem de erro (há testes automatizados garantindo isso).
- **Nenhum dado guardado.** Não há login nem banco de dados. A única coisa salva é a preferência de tema, no próprio navegador.
- **Validação dupla.** O endereço é validado no navegador, antes de qualquer chamada, e de novo no servidor.

## Como funciona

```mermaid
flowchart LR
    U["Navegador<br/>(Angular)"] -->|"GET /api/tokens?address=…"| F["Função serverless<br/>no Vercel"]
    F -->|"17 consultas EVM em paralelo<br/>ou 1 consulta Solana"| A["Alchemy<br/>Portfolio API"]
    A --- E["Ethereum"]
    A --- R["Arbitrum"]
    A --- B["Base"]
    A --- M["+ 14 redes EVM"]
    A --- S["Solana<br/>(SOL + SPL)"]
    F -.->|"preços que faltarem"| P["Alchemy<br/>Prices API"]
    F -->|"posições de lending<br/>(carteiras EVM)"| V["Aave API<br/>(GraphQL v3)"]
    F -->|"JSON limpo e consolidado"| U
```

1. O navegador valida o endereço (0x para EVM ou base58 para Solana) e chama uma única rota, `/api/tokens`.
2. A função serverless consulta a Alchemy nas 17 redes EVM ao mesmo tempo (ou só na Solana, quando o endereço é Solana), percorre a paginação e remove duplicados. Quando a Alchemy não manda o preço do token nativo de uma rede (acontece em Zora, Unichain, Shape, Monad, HyperEVM e Robinhood Chain), uma única chamada extra à Prices API completa. Na Robinhood Chain, onde nem os ERC-20 vêm com preço, a Prices API também é consultada por contrato, e o que continuar sem preço (spam) fica de fora.
3. A mesma função filtra spam e poeira, converte saldos e preços e soma o total.
4. O navegador recebe uma resposta pronta para exibir. Não há cálculo pesado no front.

### Decisões que fazem diferença

- **Falha parcial avisada, nunca escondida.** Se alguma rede não responder, as outras aparecem junto com um aviso que nomeia as que faltaram e um botão para tentar de novo. Resultado parcial não entra no cache da CDN. Se todas as redes falharem, a resposta é um erro.
- **Rápido em consultas repetidas.** As respostas ficam 60 segundos em cache na CDN do Vercel, o que também economiza a cota da API.
- **Página inicial leve.** A biblioteca do gráfico só é baixada quando há dados para mostrar.
- **Sem respostas atrasadas na tela.** Uma nova consulta cancela a anterior, e cada consulta tem limite de 15 segundos.
- **Validado contra a API real.** A integração foi conferida com respostas reais da Alchemy antes de ir para produção. Um exemplo do que isso pegou: a API devolve o token nativo de cada rede (ETH, POL, BNB, AVAX…) sem nome, símbolo nem casas decimais, o que faria o principal ativo da carteira sumir da lista. O caso é tratado e coberto por teste.

## Tecnologias

| Camada     | Tecnologia                                                           |
| ---------- | -------------------------------------------------------------------- |
| Front-end  | Angular 22 (componentes standalone, zoneless, Signals), TypeScript 6 |
| Gráfico    | ApexCharts 8 via `ng-apexcharts`, carregado sob demanda com `@defer` |
| Back-end   | Vercel Functions em Node.js 24                                       |
| Dados      | Alchemy Portfolio API (saldos, metadados e preços)                   |
| Testes     | Vitest 5 (jsdom para o front, Node para o servidor)                  |
| Hospedagem | Vercel, com deploy automático a cada push                            |

## Qualidade

**352 testes automatizados**, todos passando:

- **162 no front-end:** componentes, serviço de carteira, formatação de valores, tema e filtros.
- **190 no servidor:** validação de endereço, conversão dos dados da Alchemy, posições da Aave, token nativo de cada rede, filtros de spam, paginação, falhas parciais e proteção da chave da API.

## Rodando localmente

**Pré-requisitos:** Node.js 24, uma conta no [Vercel](https://vercel.com) e uma chave da [Alchemy](https://dashboard.alchemy.com) com as 17 redes acima e a Solana habilitadas. Rede não habilitada no app da Alchemy aparece no aviso de falha parcial.

```bash
npm install
npx vercel link
```

Cadastre a variável `ALCHEMY_API_KEY` no projeto do Vercel, em Settings → Environment Variables, nos ambientes Production, Preview e Development. Depois:

```bash
npx vercel env pull .env.local
npx vercel dev
```

O app abre em http://localhost:3000. O `vercel dev` usa as variáveis do projeto no Vercel, por isso a chave precisa estar cadastrada lá.

**Só quer ver a interface?** `npm run start:mock` sobe o app em http://localhost:4200 com dados fictícios, sem precisar de chave nem de conta no Vercel. Endereços de demonstração: `0x0000000000000000000000000000000000000000` (carteira vazia), `0x000000000000000000000000000000000000dead` (erro) `0x00000000000000000000000000000000000beef0` (Linea e Scroll fora do ar) e `0x00000000000000000000000000000000000000b2` (segunda carteira, com tokens em comum com as outras, para testar a soma).

### Testes

```bash
npx ng test --watch=false     # front-end
npm run test:node             # servidor
npm run typecheck:server      # tipos do servidor
```

### Estrutura

```
api/          Função serverless do Vercel (entrada fina, sem lógica)
server/       Cadastro de redes, cliente da Alchemy, conversão dos dados e regras da rota /api/tokens
shared/       Código usado pelo front e pelo servidor (contrato de dados, validação)
src/app/      Aplicação Angular
  core/       Serviço da carteira, formatação e tema
  features/   Componentes de tela (entrada, resumo, gráfico, lista, filtro)
  mock/       API fictícia para desenvolvimento
docs/         Documento de design e backlog
```

## Limitações conhecidas

- Aceita endereços `0x` (EVM) e endereços Solana. Nomes ENS (como `vitalik.eth`) ainda não são resolvidos.
- Redes EVM e Solana. Starknet e Tron (outro formato de endereço) e Sonic, Sei e Astar (sem suporte na Portfolio API da Alchemy) ficam de fora.
- Aave: só a v3, sem APY nem rendimento acumulado. Outros protocolos de lending e stake ainda não aparecem.
- Solana: SOL delegado em stake accounts não entra no total, e tokens SPL sem preço na Alchemy ficam de fora (como PYUSD e USDG).
- Valores apenas em USD.
- O spam é filtrado por heurística. Um token de spam que tenha preço de mercado pode aparecer.
- Carteiras muito grandes são lidas até 5 páginas por rede (cerca de 500 tokens).

## Próximos passos

Planejados para versões futuras (detalhes em [`docs/backlog.md`](docs/backlog.md)):

- Outros protocolos de empréstimo (Compound, Spark, Morpho; Kamino/marginfi na Solana) e stake (EVM e Solana)
- Histórico da evolução do patrimônio
- Alertas e notificações
- Valores em EUR

---

Desenvolvido por **Gabriel Feliciano** · [GitHub](https://github.com/Gabriielfeliciano)
