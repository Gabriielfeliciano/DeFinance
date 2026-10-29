import { describe, expect, it } from 'vitest';
import type { TokenItem } from '../shared/token';
import {
  DUST,
  ETH_NATIVE,
  NO_METADATA,
  PRICE_WITH_ERROR,
  RH_TSLA,
  RH_TSLA_CONTRACT,
  SPAM_NO_PRICE,
  USDC,
  ZERO_BALANCE,
} from './__fixtures__/alchemy-tokens';
import { SOL_NATIVE, SOL_SPAM, SOL_USDC, SOL_USDC_MINT } from './__fixtures__/alchemy-solana';
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

  it.each([
    ['zora', 'zora-mainnet'],
    ['robinhood', 'robinhood-mainnet'],
  ] as const)('maps the native token of the %s L2 as ETH', (chain, network) => {
    const [eth] = toTokenItems([{ ...ETH_NATIVE, network }], chain);
    expect(eth).toMatchObject({ id: `${chain}:native`, symbol: 'ETH', logoUrl: '/tokens/eth.svg' });
  });

  it.each([
    ['polygon', 'POL', 'Polygon Ecosystem Token'],
    ['bnb', 'BNB', 'BNB'],
    ['avalanche', 'AVAX', 'Avalanche'],
    ['berachain', 'BERA', 'Berachain'],
    ['monad', 'MON', 'Monad'],
    ['hyperevm', 'HYPE', 'Hyperliquid'],
  ] as const)('maps the %s native token as %s', (chain, symbol, name) => {
    const [native] = toTokenItems([ETH_NATIVE], chain);
    expect(native).toMatchObject({ id: `${chain}:native`, symbol, name });
    expect(native.logoUrl).toMatch(
      /^https:\/\/coin-images\.coingecko\.com\/coins\/images\/\d+\/small\//,
    );
  });

  it('prices a native token with the fallback when Alchemy sends no price', () => {
    const [eth] = toTokenItems([{ ...ETH_NATIVE, tokenPrices: [] }], 'unichain', new Map(), 2500);
    expect(eth.priceUsd).toBe(2500);
    expect(eth.valueUsd).toBeCloseTo(500, 6);
  });

  it('keeps the Alchemy native price over the fallback', () => {
    const [eth] = toTokenItems([ETH_NATIVE], 'ethereum', new Map(), 2500);
    expect(eth.priceUsd).toBe(4608.2208671202);
  });

  it('never uses the native fallback price for an ERC-20 token', () => {
    expect(toTokenItems([{ ...USDC, tokenPrices: [] }], 'ethereum', new Map(), 2500)).toEqual([]);
  });

  it('prices an ERC-20 from the contract price index when Alchemy sends no price', () => {
    const prices = new Map([[RH_TSLA_CONTRACT, 405.83]]);
    const [tsla] = toTokenItems([RH_TSLA], 'robinhood', new Map(), undefined, prices);
    expect(tsla).toMatchObject({
      id: `robinhood:${RH_TSLA_CONTRACT}`,
      symbol: 'TSLA',
      balance: 1,
      priceUsd: 405.83,
    });
  });

  it('keeps the Alchemy ERC-20 price over the contract price index', () => {
    const prices = new Map([['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 2]]);
    const [usdc] = toTokenItems([USDC], 'ethereum', new Map(), undefined, prices);
    expect(usdc.priceUsd).toBe(0.9998);
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
    expect(buildPortfolio([] as TokenItem[])).toEqual({
      tokens: [],
      totalValueUsd: 0,
      failedChains: [],
    });
  });

  it('carries the chains that failed', () => {
    expect(buildPortfolio([], ['arbitrum', 'linea']).failedChains).toEqual(['arbitrum', 'linea']);
  });
});

describe('toTokenItems (Solana)', () => {
  it('maps native SOL with 9 decimals', () => {
    const [sol] = toTokenItems([SOL_NATIVE], 'solana');
    expect(sol).toMatchObject({
      id: 'solana:native',
      chain: 'solana',
      symbol: 'SOL',
      name: 'Solana',
    });
    expect(sol.balance).toBe(Number(BigInt(SOL_NATIVE.tokenBalance)) / 1e9);
  });

  it('keeps the mint case in id, logo and price lookups', () => {
    const logos = new Map([[SOL_USDC_MINT, 'https://logo.test/usdc.png']]);
    const noLogo = { ...SOL_USDC, tokenMetadata: { ...SOL_USDC.tokenMetadata!, logo: null } };
    const [withLogo] = toTokenItems([noLogo], 'solana', logos);
    expect(withLogo.id).toBe(`solana:${SOL_USDC_MINT}`);
    expect(withLogo.logoUrl).toBe('https://logo.test/usdc.png');

    const unpriced = { ...SOL_USDC, tokenPrices: [] };
    const [priced] = toTokenItems(
      [unpriced],
      'solana',
      new Map(),
      undefined,
      new Map([[SOL_USDC_MINT, 0.5]]),
    );
    expect(priced.priceUsd).toBe(0.5);
  });

  it('drops SOL_SPAM', () => {
    expect(toTokenItems([SOL_SPAM], 'solana')).toEqual([]);
  });
});
