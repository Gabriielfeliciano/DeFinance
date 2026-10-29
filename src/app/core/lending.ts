import type { LendingMarket } from '../../../shared/lending';
import type { TokenItem } from '../../../shared/token';

export type HealthLevel = 'danger' | 'warning' | 'safe';

/** Abaixo de 1,1 perigo; de 1,1 a 1,5 atenção; acima de 1,5 seguro. */
export function healthLevel(hf: number): HealthLevel {
  if (hf < 1.1) return 'danger';
  return hf <= 1.5 ? 'warning' : 'safe';
}

const HEALTH = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `1,38`; acima de 100 vira `> 100`. */
export function formatHealthFactor(hf: number): string {
  return hf > 100 ? '> 100' : HEALTH.format(hf);
}

export function lendingTotals(markets: LendingMarket[]): { suppliedUsd: number; borrowedUsd: number } {
  let suppliedUsd = 0;
  let borrowedUsd = 0;
  for (const market of markets) {
    for (const asset of market.supplied) suppliedUsd += asset.valueUsd;
    for (const asset of market.borrowed) borrowedUsd += asset.valueUsd;
  }
  return { suppliedUsd, borrowedUsd };
}

/** Um item por ativo depositado, só para o gráfico de alocação. */
export function suppliesAsTokens(markets: LendingMarket[]): TokenItem[] {
  return markets.flatMap((market) =>
    market.supplied.map((asset) => ({
      id: `${market.id}:supply:${asset.underlying}`,
      chain: market.chain,
      symbol: asset.symbol,
      name: asset.name,
      logoUrl: asset.logoUrl,
      balance: asset.balance,
      priceUsd: asset.balance > 0 ? asset.valueUsd / asset.balance : 0,
      valueUsd: asset.valueUsd,
    })),
  );
}
