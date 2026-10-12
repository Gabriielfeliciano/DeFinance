import type { TokenItem } from '../../../../shared/token';

/** Máximo de fatias; acima disso as menores viram "Outros". */
export const MAX_SLICES = 7;
export const OTHERS_LABEL = 'Outros';

export interface ChartData {
  labels: string[];
  values: number[];
  /** Participação de cada fatia em %, uma casa decimal. */
  percents: number[];
}

export function toChartData(tokens: TokenItem[]): ChartData {
  const bySymbol = new Map<string, number>();
  for (const token of tokens) {
    const symbol = token.symbol.toUpperCase();
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + token.valueUsd);
  }

  let slices = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]);
  if (slices.length > MAX_SLICES) {
    const head = slices.slice(0, MAX_SLICES - 1);
    const others = slices.slice(MAX_SLICES - 1).reduce((sum, [, value]) => sum + value, 0);
    slices = [...head, [OTHERS_LABEL, others]];
  }

  const total = slices.reduce((sum, [, value]) => sum + value, 0);
  return {
    labels: slices.map(([label]) => label),
    values: slices.map(([, value]) => value),
    percents: slices.map(([, value]) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)),
  };
}
