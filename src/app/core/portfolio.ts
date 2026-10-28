import type { ChainId, TokenItem } from '../../../shared/token';

export type WalletLoadStatus = 'loading' | 'success' | 'empty' | 'error';
export type PortfolioStatus = 'idle' | WalletLoadStatus;

export interface WalletState {
  /** Como o usuário colou. */
  address: string;
  /** Entra na soma do painel. */
  enabled: boolean;
  status: WalletLoadStatus;
  tokens: TokenItem[];
  totalValueUsd: number;
  failedChains: ChainId[];
}

/** Uma linha por `TokenItem.id`, somando saldo e valor; maior valor primeiro. */
export function mergeTokens(lists: TokenItem[][]): TokenItem[] {
  const merged = new Map<string, TokenItem>();
  for (const token of lists.flat()) {
    const current = merged.get(token.id);
    merged.set(
      token.id,
      current
        ? { ...current, balance: current.balance + token.balance, valueUsd: current.valueUsd + token.valueUsd }
        : { ...token },
    );
  }
  return [...merged.values()].sort((a, b) => b.valueUsd - a.valueUsd);
}

/** Estado do painel a partir das carteiras ligadas. Erro vence vazio. */
export function portfolioStatus(enabled: WalletState[], walletCount: number): PortfolioStatus {
  if (walletCount === 0) return 'idle';
  const has = (status: WalletLoadStatus) => enabled.some((wallet) => wallet.status === status);
  if (has('success')) return 'success';
  if (has('loading')) return 'loading';
  if (has('error')) return 'error';
  return 'empty';
}
