# DeFinance — Multi-carteira (até 3 carteiras EVM)

**Data:** 2026-10-28
**Status:** Aguardando aprovação

## 1. Intenção

Hoje o DeFinance mostra uma carteira por vez. Quem tem fundos espalhados em
mais de um endereço precisa consultar um por um e somar de cabeça. Esta
iteração deixa o usuário colar **até 3 endereços EVM**, ver o patrimônio
**somado** e escolher quais carteiras entram na soma (uma, duas ou as três).

Sai do backlog o item "Multi-carteira".

## 2. Objetivos

- Adicionar até 3 carteiras EVM pelo mesmo campo de endereço de hoje.
- Total, gráfico, lista de tokens e filtro de rede refletem só as carteiras
  ligadas.
- O mesmo token na mesma rede em carteiras diferentes aparece como **uma
  linha só**, com quantidade e valor somados.
- Ver o valor de cada carteira individualmente, nos cartões de carteira.

## 3. Fora do escopo (não-objetivos)

- **Persistência.** Nada é salvo; recarregar a página começa do zero. Salvar
  carteiras por usuário fica para quando existir login (backlog).
- **Redes não-EVM** (Solana, Starknet, Tron): continuam no backlog.
- **Apelidos/nomes de carteira**, reordenação, ENS.
- **Linha por carteira na lista de tokens** ou detalhamento de "qual carteira
  tem quanto" de cada token.
- Mudanças no servidor (`/api/tokens` continua recebendo um endereço).

## 4. Anti-objetivos (seria falha mesmo funcionando)

- Uma carteira com erro derrubar ou esconder as outras.
- Somar a mesma carteira duas vezes.
- O app passar a pedir qualquer coisa além do endereço público.

## 5. Como fica na tela (decidido com o usuário: opção "cartões")

```
[ 0x…  (adicionar carteira, 2 de 3) ] [Adicionar]

┌──────────────────┐ ┌──────────────────┐
│ ☑ 0xd8dA…6045  ✕ │ │ ☑ 0x1a2B…9f3c  ✕ │
│ US$ 1.200.000    │ │ US$ 84.003       │
└──────────────────┘ └──────────────────┘

(Todas) (Ethereum) (Base) …          ← filtro de rede, como hoje

Total (2 de 3 carteiras)  US$ 1.284.003 | gráfico | lista de tokens
```

- O campo de endereço continua no topo. Cada endereço válido vira um cartão
  com: endereço curto (`0x` + 4 … últimos 4), caixa liga/desliga, ✕ para
  remover e o valor total daquela carteira (sem filtro de rede).
- Com 3 carteiras, o campo e o botão ficam desabilitados com o aviso
  "3 de 3". Remover uma libera o campo de novo.
- No celular os cartões empilham (sem rolagem horizontal, mesma regra do resto
  do app).

## 6. Regras de comportamento

Decididas pelo usuário:

- Até 3 carteiras, só EVM, validação igual à de hoje (`isValidEvmAddress`).
- Soma por token: uma linha por `TokenItem.id` (`<chain>:<contrato|native>`),
  somando `balance` e `valueUsd`.
- Sem persistência.

Calls minhas, aprovadas na revisão em chat:

- Carteira recém-adicionada entra **ligada**.
- **Não é possível desligar a última carteira ligada** (a caixa fica
  desabilitada). Remover com ✕ continua possível sempre.
- Endereço repetido é recusado com "Essa carteira já foi adicionada.",
  comparando em minúsculas.
- Cada carteira é buscada com uma chamada própria a `/api/tokens`, e a soma é
  feita no navegador. O servidor não muda.
- Cada cartão tem estado próprio: carregando (esqueleto), erro (com "Tentar
  novamente" no cartão, refazendo só aquela carteira) ou valor.
- Falha de uma carteira não afeta as outras: total/lista/gráfico usam as
  carteiras ligadas que carregaram com sucesso.
- Quando uma carteira ligada falha e outras carregam (decidido pelo usuário):
  o painel mostra um aviso no mesmo estilo do aviso de rede, "Não foi
  possível carregar 0x1a2B…9f3c. O total pode estar incompleto.", com
  "Tentar novamente" refazendo as carteiras ligadas que falharam. Com mais de
  uma falhando, os endereços curtos são listados juntos ("0x1a2B…9f3c e
  0x77eF…01aa"). A legenda conta só as carteiras que carregaram com sucesso.
- O aviso "Não foi possível carregar X agora" junta (sem repetir) as
  `failedChains` das carteiras ligadas. "Tentar novamente" do aviso refaz as
  carteiras ligadas que tiveram redes falhando.
- Carteira sem ativos vira cartão "US$ 0"; o estado de vazio do painel
  ("Nenhum ativo com valor de mercado encontrado") só aparece quando **todas**
  as carteiras ligadas que carregaram estão vazias.
- Ligar/desligar uma carteira não refaz a busca; só recalcula a soma.
- Se o ✕ remove a última carteira ligada e sobram carteiras desligadas, a
  primeira que sobrou (ordem de adição) é ligada automaticamente. Assim nunca
  existe "carteiras adicionadas, nenhuma ligada".
- "Tentar novamente" (no cartão ou no aviso) faz a carteira voltar a
  carregar como hoje: os dados antigos dela saem da soma até a resposta
  chegar. Não existe modo "atualizando com dados antigos".
- Ao adicionar ou remover carteira, o filtro de rede volta para "Todas" (como
  hoje ao trocar de endereço). Ao ligar/desligar, mantém o filtro, a menos que
  a rede selecionada deixe de ter tokens; aí volta para "Todas".

## 7. Estados do painel (resultado agregado)

Considerando só as carteiras ligadas:

| Situação | Painel mostra |
|---|---|
| Nenhuma carteira adicionada | Estado `idle` de hoje (dica de somente leitura) |
| Alguma ligada carregando, nenhuma com sucesso ainda | Esqueleto de hoje |
| Pelo menos uma com sucesso e tokens | Resultado somado (as que ainda carregam entram quando chegarem) |
| Todas as que terminaram estão vazias, nenhuma carregando | Estado vazio |
| Todas as ligadas com erro | Banner de erro de hoje, com "Tentar novamente" refazendo as que falharam |
| Nenhuma carregando, nenhuma com tokens, mistura de erro e vazio | Banner de erro (erro tem prioridade sobre vazio) |

Texto do resumo: "Valor total" segue como hoje; a legenda indica quantas
carteiras entram na soma ("2 de 3 carteiras") quando há mais de uma
adicionada. O numerador conta só as ligadas que carregaram com sucesso; o
denominador, todas as adicionadas.

## 8. Restrições

- Angular standalone + Signals, mesmo padrão container/presentational do MVP.
- Testes no mesmo estilo dos `*.spec.ts` atuais; manter a cobertura dos
  estados existentes.
- Modo `mock` precisa permitir testar multi-carteira manualmente (pelo menos
  dois endereços com portfólios diferentes e com tokens em comum).
- Cada requisição mantém o timeout de 15 s atual, e trocar/remover uma
  carteira cancela só a requisição dela.

## 9. Deixado para quem implementar

- Se `WalletService` vira uma lista de carteiras ou se surge um serviço novo
  que compõe vários estados de carteira.
- Nome, estrutura e testes do componente de cartão de carteira.
- Ordem dos tokens após a soma (seguir a ordem atual: valor decrescente).
- Atualizar `README.md` (funcionalidades) e remover "Multi-carteira" de
  `docs/backlog.md`.
