import type { TokenItem } from '../../../shared/token';
import type { LendingMarket } from '../../../shared/lending';
import { mergeTokens, portfolioStatus, walletNetUsd, type WalletLoadStatus, type WalletState } from './portfolio';

const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  logoUrl: '/tokens/eth.svg',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};
const BASE_ETH: TokenItem = { ...ETH, id: 'base:native', chain: 'base', balance: 1, valueUsd: 4600 };

function wallet(status: WalletLoadStatus): WalletState {
  return { address: '0x1', enabled: true, status, tokens: [], totalValueUsd: 0, failedChains: [], lending: [], lendingFailed: false };
}

describe('mergeTokens', () => {
  it('sums balance and value of the same token across wallets', () => {
    const merged = mergeTokens([[ETH], [{ ...ETH, balance: 0.3, valueUsd: 1380 }]]);
    expect(merged).toEqual([{ ...ETH, balance: 0.5, valueUsd: 2300 }]);
  });

  it('keeps the same asset on different chains apart', () => {
    expect(mergeTokens([[ETH], [BASE_ETH]]).map((token) => token.id)).toEqual(['base:native', 'ethereum:native']);
  });

  it('sorts by value, largest first', () => {
    expect(mergeTokens([[ETH, BASE_ETH]]).map((token) => token.valueUsd)).toEqual([4600, 920]);
  });

  it('returns an empty list for no wallets', () => {
    expect(mergeTokens([])).toEqual([]);
  });

  it('does not mutate the input tokens', () => {
    mergeTokens([[ETH], [ETH]]);
    expect(ETH.balance).toBe(0.2);
  });
});

describe('portfolioStatus', () => {
  it('is idle with no wallets added', () => {
    expect(portfolioStatus([], 0)).toBe('idle');
  });

  it('is success when any wallet loaded tokens', () => {
    expect(portfolioStatus([wallet('loading'), wallet('error'), wallet('success')], 3)).toBe('success');
  });

  it('is loading while nothing succeeded and something is loading', () => {
    expect(portfolioStatus([wallet('empty'), wallet('loading')], 2)).toBe('loading');
  });

  it('prefers error over empty once nothing is loading', () => {
    expect(portfolioStatus([wallet('empty'), wallet('error')], 2)).toBe('error');
  });

  it('is empty when every wallet is empty', () => {
    expect(portfolioStatus([wallet('empty'), wallet('empty')], 2)).toBe('empty');
  });
});

describe('walletNetUsd', () => {
  const asset = (valueUsd: number) => ({ underlying: '0x', symbol: 'X', name: 'X', balance: 1, valueUsd });
  const market = (supplied: number, borrowed: number): LendingMarket => ({
    id: 'ethereum:0xa',
    chain: 'ethereum',
    label: 'Aave · Ethereum',
    supplied: [asset(supplied)],
    borrowed: [asset(borrowed)],
    healthFactor: 1.6,
  });

  it('adds tokens and supplied, subtracts borrowed', () => {
    const state = { ...wallet('success'), totalValueUsd: 146, lending: [market(245064, 150626)] };
    expect(walletNetUsd(state)).toBe(94584);
  });

  it('stays negative', () => {
    const state = { ...wallet('success'), totalValueUsd: 10, lending: [market(100, 500)] };
    expect(walletNetUsd(state)).toBe(-390);
  });

  it('equals the token total without lending', () => {
    expect(walletNetUsd({ ...wallet('success'), totalValueUsd: 920 })).toBe(920);
  });
});
