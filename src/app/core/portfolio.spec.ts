import type { TokenItem } from '../../../shared/token';
import { mergeTokens, portfolioStatus, type WalletLoadStatus, type WalletState } from './portfolio';

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
  return { address: '0x1', enabled: true, status, tokens: [], totalValueUsd: 0, failedChains: [] };
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
