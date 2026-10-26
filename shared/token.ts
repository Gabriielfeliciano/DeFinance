/** Redes EVM consultadas, na ordem dos chips do filtro. */
export const CHAINS = [
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
] as const;

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
};

export interface TokenItem {
  /** Chave estável: `<chain>:<contrato em minúsculas | native>`. */
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
}
