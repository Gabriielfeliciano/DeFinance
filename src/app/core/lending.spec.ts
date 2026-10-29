import type { LendingAsset, LendingMarket } from '../../../shared/lending';
import { formatHealthFactor, healthLevel, lendingTotals, suppliesAsTokens } from './lending';

const asset = (symbol: string, balance: number, valueUsd: number): LendingAsset => ({
  underlying: `0x${symbol.toLowerCase()}`,
  symbol,
  name: symbol,
  logoUrl: `/${symbol}.svg`,
  balance,
  valueUsd,
});

const market = (id: string, supplied: LendingAsset[], borrowed: LendingAsset[]): LendingMarket => ({
  id,
  chain: 'ethereum',
  label: 'Aave · Ethereum',
  supplied,
  borrowed,
  healthFactor: 1.5,
});

describe('healthLevel', () => {
  it.each([
    [1.09, 'danger'],
    [1.1, 'warning'],
    [1.5, 'warning'],
    [1.51, 'safe'],
  ] as const)('%s is %s', (hf, level) => {
    expect(healthLevel(hf)).toBe(level);
  });
});

describe('formatHealthFactor', () => {
  it('uses two decimals in pt-BR', () => {
    expect(formatHealthFactor(1.3829)).toBe('1,38');
    expect(formatHealthFactor(100)).toBe('100,00');
  });

  it('caps above 100', () => {
    expect(formatHealthFactor(100.01)).toBe('> 100');
  });
});

describe('lendingTotals', () => {
  it('sums supplied and borrowed over markets', () => {
    const markets = [
      market('ethereum:0xa', [asset('WETH', 1, 100), asset('USDC', 50, 50)], [asset('DAI', 30, 30)]),
      market('ethereum:0xb', [asset('WBTC', 1, 200)], [asset('USDT', 10, 10)]),
    ];
    expect(lendingTotals(markets)).toEqual({ suppliedUsd: 350, borrowedUsd: 40 });
  });

  it('is zero without markets', () => {
    expect(lendingTotals([])).toEqual({ suppliedUsd: 0, borrowedUsd: 0 });
  });
});

describe('suppliesAsTokens', () => {
  it('maps each supplied asset to a token item', () => {
    const markets = [market('ethereum:0xa', [asset('WETH', 2, 100), asset('ZERO', 0, 0)], [asset('DAI', 1, 1)])];
    expect(suppliesAsTokens(markets)).toEqual([
      {
        id: 'ethereum:0xa:supply:0xweth',
        chain: 'ethereum',
        symbol: 'WETH',
        name: 'WETH',
        logoUrl: '/WETH.svg',
        balance: 2,
        priceUsd: 50,
        valueUsd: 100,
      },
      {
        id: 'ethereum:0xa:supply:0xzero',
        chain: 'ethereum',
        symbol: 'ZERO',
        name: 'ZERO',
        logoUrl: '/ZERO.svg',
        balance: 0,
        priceUsd: 0,
        valueUsd: 0,
      },
    ]);
  });
});
