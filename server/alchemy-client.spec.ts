import { describe, expect, it, vi } from 'vitest';
import { ETH_NATIVE, PRICES_BY_SYMBOL, USDC, alchemyPage } from './__fixtures__/alchemy-tokens';
import { AlchemyError, MAX_PAGES, fetchChainTokens, fetchPricesBySymbol } from './alchemy-client';

const ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const API_KEY = 'secret-key';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestBody(fetchFn: ReturnType<typeof vi.fn<typeof fetch>>, call: number) {
  return JSON.parse(fetchFn.mock.calls[call][1]!.body as string);
}

describe('fetchChainTokens', () => {
  it('POSTs the wallet and network to the Tokens By Wallet endpoint', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(alchemyPage([ETH_NATIVE])));

    const tokens = await fetchChainTokens(ADDRESS, 'arbitrum', API_KEY, fetchFn);

    expect(tokens).toEqual([ETH_NATIVE]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens/by-address`);
    expect(init?.method).toBe('POST');
    expect(requestBody(fetchFn, 0)).toEqual({
      addresses: [{ address: ADDRESS, networks: ['arb-mainnet'] }],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
      includeErc20Tokens: true,
    });
  });

  it.each([
    ['ethereum', 'eth-mainnet'],
    ['optimism', 'opt-mainnet'],
    ['polygon', 'polygon-mainnet'],
    ['bnb', 'bnb-mainnet'],
    ['avalanche', 'avax-mainnet'],
    ['zora', 'zora-mainnet'],
    ['hyperevm', 'hyperliquid-mainnet'],
    ['robinhood', 'robinhood-mainnet'],
  ] as const)('asks Alchemy for %s as %s', async (chain, network) => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(alchemyPage([])));

    await fetchChainTokens(ADDRESS, chain, API_KEY, fetchFn);

    expect(requestBody(fetchFn, 0).addresses[0].networks).toEqual([network]);
  });

  it('follows pageKey until the last page', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(alchemyPage([ETH_NATIVE], 'page-2')))
      .mockResolvedValueOnce(jsonResponse(alchemyPage([USDC])));

    const tokens = await fetchChainTokens(ADDRESS, 'ethereum', API_KEY, fetchFn);

    expect(tokens).toEqual([ETH_NATIVE, USDC]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchFn, 1).pageKey).toBe('page-2');
  });

  it(`stops after ${MAX_PAGES} pages and ignores tokens repeated across pages`, async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse(alchemyPage([ETH_NATIVE], 'again')),
    );

    const tokens = await fetchChainTokens(ADDRESS, 'ethereum', API_KEY, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(MAX_PAGES);
    expect(tokens).toEqual([ETH_NATIVE]);
  });

  it('throws AlchemyError on a non-2xx response such as a rate limit', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({ message: 'Too Many Requests' }, 429),
    );

    await expect(fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn)).rejects.toThrow(AlchemyError);
  });

  it('throws AlchemyError on a partial failure reported with HTTP 200', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        data: { tokens: [ETH_NATIVE], pageKey: null },
        error: {
          message: 'Partial failure',
          partialErrors: [{ network: 'base-mainnet', message: 'timeout' }],
        },
      }),
    );

    await expect(fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn)).rejects.toThrow(AlchemyError);
  });

  it('never puts the API key in error messages', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({}, 500));

    const error = await fetchChainTokens(ADDRESS, 'base', API_KEY, fetchFn).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AlchemyError);
    expect((error as Error).message).not.toContain(API_KEY);
  });
});

describe('fetchPricesBySymbol', () => {
  it('GETs the Prices By Symbol endpoint and returns USD prices by symbol', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(PRICES_BY_SYMBOL));

    const prices = await fetchPricesBySymbol(['ETH', 'MON'], API_KEY, fetchFn);

    expect(fetchFn.mock.calls[0][0]).toBe(
      `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/by-symbol?symbols=ETH&symbols=MON`,
    );
    expect(prices).toEqual(
      new Map([
        ['ETH', 2322.04],
        ['MON', 0.021938],
      ]),
    );
  });

  it('leaves out symbols Alchemy could not price', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(PRICES_BY_SYMBOL));

    const prices = await fetchPricesBySymbol(['ETH', 'MON', 'NOPE'], API_KEY, fetchFn);

    expect(prices.has('NOPE')).toBe(false);
  });

  it('throws AlchemyError without the API key on a non-2xx response', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({}, 503));

    const error = await fetchPricesBySymbol(['ETH'], API_KEY, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AlchemyError);
    expect((error as Error).message).not.toContain(API_KEY);
  });
});
