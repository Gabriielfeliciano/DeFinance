import type { LendingMarket } from './lending';

/** Redes EVM consultadas, na ordem dos chips do filtro. */
export const EVM_CHAINS = [
  'ethereum',
  'arbitrum',
  'base',
  'optimism',
  'polygon',
  'bnb',
  'avalanche',
  'zksync',
  'linea',
  'scroll',
  'berachain',
  'zora',
  'unichain',
  'shape',
  'monad',
  'hyperevm',
  'robinhood',
] as const;

/** Todas as redes: as EVM e a Solana. */
export const CHAINS = [...EVM_CHAINS, 'solana'] as const;

export type EvmChainId = (typeof EVM_CHAINS)[number];
export type ChainId = (typeof CHAINS)[number];

export const CHAIN_LABELS: Record<ChainId, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  polygon: 'Polygon',
  bnb: 'BNB Chain',
  avalanche: 'Avalanche',
  zksync: 'zkSync',
  linea: 'Linea',
  scroll: 'Scroll',
  berachain: 'Berachain',
  zora: 'Zora',
  unichain: 'Unichain',
  shape: 'Shape',
  monad: 'Monad',
  hyperevm: 'HyperEVM',
  robinhood: 'Robinhood Chain',
  solana: 'Solana',
};

export interface TokenItem {
  /** Chave estável: `<chain>:<contrato | native>`. O contrato vai em minúsculas nas EVM; o mint da Solana mantém a caixa. */
  id: string;
  chain: ChainId;
  symbol: string;
  name: string;
  logoUrl?: string;
  /** Já convertido de decimals. */
  balance: number;
  priceUsd: number;
  /** balance * priceUsd */
  valueUsd: number;
}

export interface TokensResponse {
  tokens: TokenItem[];
  totalValueUsd: number;
  /** Redes que falharam: `tokens` e o total vêm sem elas. */
  failedChains: ChainId[];
  /** Posições de empréstimo (Aave v3). */
  lending?: LendingMarket[];
  /** A consulta à Aave falhou: `lending` vem vazio. */
  lendingFailed?: boolean;
}
