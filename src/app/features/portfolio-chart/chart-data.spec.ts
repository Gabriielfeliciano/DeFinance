import type { ChainId, TokenItem } from '../../../../shared/token';
import { MAX_SLICES, OTHERS_LABEL, toChartData } from './chart-data';

function token(symbol: string, valueUsd: number, chain: ChainId = 'ethereum'): TokenItem {
  return { id: `${chain}:${symbol}`, chain, symbol, name: symbol, balance: 1, priceUsd: valueUsd, valueUsd };
}

describe('toChartData', () => {
  it('merges the same symbol across chains into one slice', () => {
    const data = toChartData([token('ETH', 600, 'ethereum'), token('eth', 400, 'base'), token('USDC', 500)]);
    expect(data.labels).toEqual(['ETH', 'USDC']);
    expect(data.values).toEqual([1000, 500]);
  });

  it('merges USDC on solana and on ethereum into one slice', () => {
    const data = toChartData([token('USDC', 300, 'solana'), token('USDC', 200, 'ethereum')]);
    expect(data.labels).toEqual(['USDC']);
    expect(data.values).toEqual([500]);
  });

  it('sorts slices by value, largest first', () => {
    const data = toChartData([token('A', 1), token('B', 3), token('C', 2)]);
    expect(data.labels).toEqual(['B', 'C', 'A']);
  });

  it(`groups everything beyond ${MAX_SLICES - 1} assets into "${OTHERS_LABEL}"`, () => {
    const tokens = [9, 8, 7, 6, 5, 4, 3, 2, 1].map((v) => token(`T${v}`, v));
    const data = toChartData(tokens);
    expect(data.labels).toEqual(['T9', 'T8', 'T7', 'T6', 'T5', 'T4', OTHERS_LABEL]);
    expect(data.values.at(-1)).toBe(3 + 2 + 1);
  });

  it(`does not group when there are exactly ${MAX_SLICES} assets`, () => {
    const tokens = [7, 6, 5, 4, 3, 2, 1].map((v) => token(`T${v}`, v));
    expect(toChartData(tokens).labels).not.toContain(OTHERS_LABEL);
  });

  it('computes percentages with one decimal', () => {
    const data = toChartData([token('ETH', 1000), token('USDC', 500)]);
    expect(data.percents).toEqual([66.7, 33.3]);
  });

  it('returns empty arrays for no tokens', () => {
    expect(toChartData([])).toEqual({ labels: [], values: [], percents: [] });
  });
});
