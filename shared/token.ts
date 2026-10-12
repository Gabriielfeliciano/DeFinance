export type ChainId = 'ethereum' | 'arbitrum' | 'base';

export const CHAINS: readonly ChainId[] = ['ethereum', 'arbitrum', 'base'];

export const CHAIN_LABELS: Record<ChainId, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  base: 'Base',
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
}
