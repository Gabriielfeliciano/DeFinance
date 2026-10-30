import type { ChainId } from './token';

/** Um ativo depositado ou emprestado num mercado de empréstimo. */
export interface LendingAsset {
  /** Contrato do ativo original, em minúsculas. */
  underlying: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  balance: number;
  valueUsd: number;
}

/** Posição da carteira em um mercado (ex.: Aave v3 Ethereum). */
export interface LendingMarket {
  /** `<chain>:<endereço do mercado em minúsculas>` */
  id: string;
  chain: ChainId;
  /** `Aave · Ethereum`, `Aave · Ethereum Lido` */
  label: string;
  /** Maior valor primeiro. */
  supplied: LendingAsset[];
  /** Maior valor primeiro. */
  borrowed: LendingAsset[];
  /** `null` sem empréstimo neste mercado. */
  healthFactor: number | null;
}
