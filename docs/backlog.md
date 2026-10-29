# DeFinance — Backlog (fora do MVP)

Itens descartados do MVP durante o brainstorm de 2026-10-12, para considerar
em iterações futuras.

- **Posições em protocolos DeFi** (staking, liquidez, lending) — exige
  integração com cada protocolo individualmente, escopo grande demais
- **Login / autenticação** — MVP é 100% somente-leitura e sem persistência
  de usuário
- **Salvar carteiras por usuário** — a multi-carteira (até 3, feita em
  2026-10-28) não guarda nada; salvar depende de login
- **Histórico de evolução do patrimônio** — exige armazenar série temporal,
  precisa de back-end com persistência
- **Alertas / notificações** — exige back-end + envio assíncrono
- **EUR (toggle de moeda)** — cortado na definição do MVP para simplificar;
  Alchemy Price API já devolve USD nativo, EUR exigiria taxa de câmbio
  extra
- **Carteiras Starknet e Tron** — a Alchemy já está habilitada, mas
  usam outro formato de endereço; exige entrada e validação próprias
  (adiado em 2026-10-26, quando as redes EVM passaram de 3 para 16)
- **Plataformas de stake (EVM e Solana)** — SOL delegado em stake accounts e
  posições de staking em protocolos; pedido do usuário em 2026-10-29
- **Sonic, Sei e Astar** — habilitadas na Alchemy, mas a Portfolio API não
  aceita essas redes e o RPC delas não lista ERC-20; dá para mostrar só o
  saldo nativo. Rever quando a Alchemy ampliar o suporte
