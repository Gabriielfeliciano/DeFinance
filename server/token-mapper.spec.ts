import { describe, expect, it } from 'vitest';
import type { TokenItem } from '../shared/token';
import {
  DUST,
  ETH_NATIVE,
  NO_METADATA,
  PRICE_WITH_ERROR,
  SPAM_NO_PRICE,
  USDC,
  ZERO_BALANCE,
} from './__fixtures__/alchemy-tokens';
import { buildPortfolio, toDecimal, toTokenItems } from './token-mapper';

describe('toTokenItems', () => {
  it('maps the native token as ETH even though Alchemy sends null metadata', () => {
    const [eth] = toTokenItems([ETH_NATIVE], 'ethereum');
    expect(eth).toMatchObject({
      id: 'ethereum:native',
      chain: 'ethereum',
      symbol: 'ETH',
      name: 'Ether',
      balance: 0.2,
      priceUsd: 4608.2208671202,
    });
    expect(eth.logoUrl).toBe('/tokens/eth.svg');
    expect(eth.valueUsd).toBeCloseTo(921.644, 3);
  });

  it('maps an ERC-20 token with a lowercased contract id and no logo', () => {
    const [usdc] = toTokenItems([USDC], 'ethereum');
    expect(usdc.id).toBe('ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(usdc.balance).toBe(100);
    expect(usdc.valueUsd).toBeCloseTo(99.98, 2);
    expect(usdc.logoUrl).toBeUndefined();
  });

  it('fills a missing ERC-20 logo from the index by lowercased contract', () => {
    const logos = new Map([
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'https://assets.coingecko.com/usdc.png'],
    ]);
    const [usdc] = toTokenItems([USDC], 'ethereum', logos);
    expect(usdc.logoUrl).toBe('https://assets.coingecko.com/usdc.png');
  });

  it('keeps the Alchemy logo over the index', () => {
    const withLogo = {
      ...USDC,
      tokenMetadata: { ...USDC.tokenMetadata!, logo: 'https://static.alchemyapi.io/usdc.png' },
    };
    const logos = new Map([
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'https://assets.coingecko.com/usdc.png'],
    ]);
    const [usdc] = toTokenItems([withLogo], 'ethereum', logos);
    expect(usdc.logoUrl).toBe('https://static.alchemyapi.io/usdc.png');
  });

  it('uses the given chain for id and chain field', () => {
    const [eth] = toTokenItems([{ ...ETH_NATIVE, network: 'base-mainnet' }], 'base');
    expect(eth.id).toBe('base:native');
    expect(eth.chain).toBe('base');
  });

  it('drops spam, errored, dust, zero-balance and metadata-less tokens', () => {
    expect(
      toTokenItems([SPAM_NO_PRICE, PRICE_WITH_ERROR, DUST, ZERO_BALANCE, NO_METADATA], 'ethereum'),
    ).toEqual([]);
  });

  it('keeps valid tokens when mixed with junk', () => {
    const symbols = toTokenItems([SPAM_NO_PRICE, ETH_NATIVE, DUST, USDC], 'ethereum').map(
      (t) => t.symbol,
    );
    expect(symbols).toEqual(['ETH', 'USDC']);
  });
});

describe('toDecimal', () => {
  it('converts hex and decimal integer strings', () => {
    expect(toDecimal('0x5f5e100', 6)).toBe(100);
    expect(toDecimal('1500000', 6)).toBe(1.5);
  });

  it('returns 0 for unparseable balances', () => {
    expect(toDecimal('not-a-number', 18)).toBe(0);
  });
});

describe('buildPortfolio', () => {
  it('sums valueUsd into totalValueUsd', () => {
    const tokens = [...toTokenItems([ETH_NATIVE, USDC], 'ethereum')];
    const portfolio = buildPortfolio(tokens);
    expect(portfolio.tokens).toBe(tokens);
    expect(portfolio.totalValueUsd).toBeCloseTo(921.644 + 99.98, 2);
  });

  it('returns zero for an empty wallet', () => {
    expect(buildPortfolio([] as TokenItem[])).toEqual({ tokens: [], totalValueUsd: 0 });
  });
});
