import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChainId } from '../shared/token';
import type { AlchemyPricesBySymbol, AlchemyToken, AlchemyTokensPage } from './alchemy-types';
import { ETH_NATIVE, PRICES_BY_SYMBOL, USDC, alchemyPage } from './__fixtures__/alchemy-tokens';
import { CACHE_CONTROL, handleTokensRequest } from './tokens-handler';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const API_KEY = 'secret-key';

function request(query: string): Request {
  return new Request(`https://definance.test/api/tokens${query}`);
}

/**
 * Fake da Alchemy: Tokens By Wallet responde por rede, Prices By Symbol com
 * `prices`. Número = status HTTP de erro.
 */
function fakeAlchemy(
  byNetwork: Record<string, AlchemyTokensPage | number>,
  prices: AlchemyPricesBySymbol | number = PRICES_BY_SYMBOL,
) {
  return vi.fn<typeof fetch>(async (url, init) => {
    const reply = String(url).includes('/prices/v1/')
      ? prices
      : (byNetwork[JSON.parse(init!.body as string).addresses[0].networks[0]] ?? alchemyPage([]));
    if (typeof reply === 'number') return new Response('upstream error', { status: reply });
    return Response.json(reply);
  });
}

/** Nativo como a Alchemy manda em Zora, Unichain, Shape, Monad, HyperEVM e Robinhood Chain: sem preço. */
function unpricedNative(network: string, tokenBalance = ETH_NATIVE.tokenBalance): AlchemyToken {
  return { ...ETH_NATIVE, network, tokenBalance, tokenPrices: [] };
}

const priceCalls = (fetchFn: ReturnType<typeof fakeAlchemy>) =>
  fetchFn.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/prices/v1/'));

describe('handleTokensRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects an invalid address with 400 without calling Alchemy', async () => {
    const fetchFn = fakeAlchemy({});
    const response = await handleTokensRequest(request('?address=0x123'), {
      apiKey: API_KEY,
      fetchFn,
    });
    expect(response.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects a missing address with 400', async () => {
    const response = await handleTokensRequest(request(''), {
      apiKey: API_KEY,
      fetchFn: fakeAlchemy({}),
    });
    expect(response.status).toBe(400);
  });

  it('answers 500 when the API key is not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: undefined,
      fetchFn: fakeAlchemy({}),
    });
    expect(response.status).toBe(500);
  });

  it('aggregates all 17 chains into one cached response', async () => {
    const fetchFn = fakeAlchemy({
      'eth-mainnet': alchemyPage([ETH_NATIVE, USDC]),
      'base-mainnet': alchemyPage([{ ...ETH_NATIVE, network: 'base-mainnet' }]),
      'arb-mainnet': alchemyPage([]),
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL);
    const body = await response.json();
    expect(fetchFn).toHaveBeenCalledTimes(17);
    expect(body.tokens.map((t: { id: string }) => t.id).sort()).toEqual([
      'base:native',
      'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'ethereum:native',
    ]);
    expect(body.totalValueUsd).toBeCloseTo(921.644 * 2 + 99.98, 2);
    expect(body.failedChains).toEqual([]);
  });

  it('prices natives that Alchemy left unpriced with a single Prices API call', async () => {
    const fetchFn = fakeAlchemy({
      'zora-mainnet': alchemyPage([unpricedNative('zora-mainnet')]),
      'unichain-mainnet': alchemyPage([unpricedNative('unichain-mainnet')]),
      // 1000 MON: 0.2 MON a US$ 0.02 seria poeira.
      'monad-mainnet': alchemyPage([unpricedNative('monad-mainnet', '0x3635c9adc5dea00000')]),
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    const body = await response.json();
    expect(priceCalls(fetchFn)).toEqual([
      `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/by-symbol?symbols=ETH&symbols=MON`,
    ]);
    const priceById = Object.fromEntries(
      body.tokens.map((t: { id: string; priceUsd: number }) => [t.id, t.priceUsd]),
    );
    expect(priceById).toEqual({
      'zora:native': 2322.04,
      'unichain:native': 2322.04,
      'monad:native': 0.021938,
    });
  });

  it('skips the Prices API for an unpriced native the wallet holds none of', async () => {
    const fetchFn = fakeAlchemy({
      'zora-mainnet': alchemyPage([unpricedNative('zora-mainnet', '0x0')]),
    });

    await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });

    expect(priceCalls(fetchFn)).toEqual([]);
  });

  it('drops unpriced natives but keeps the wallet when the Prices API fails', async () => {
    const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = fakeAlchemy(
      {
        'eth-mainnet': alchemyPage([ETH_NATIVE]),
        'zora-mainnet': alchemyPage([unpricedNative('zora-mainnet')]),
      },
      503,
    );

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tokens.map((t: { id: string }) => t.id)).toEqual(['ethereum:native']);
    expect(body.failedChains).toEqual([]);
    expect(JSON.stringify(warnLog.mock.calls)).not.toContain(API_KEY);
  });

  it('fills missing logos from each chain own logo index', async () => {
    const usdcContract = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const indexes: Partial<Record<ChainId, Map<string, string>>> = {
      ethereum: new Map([[usdcContract, 'https://logos.test/eth-usdc.png']]),
      base: new Map([[usdcContract, 'https://logos.test/base-usdc.png']]),
    };
    const fetchFn = fakeAlchemy({
      'eth-mainnet': alchemyPage([USDC]),
      'base-mainnet': alchemyPage([{ ...USDC, network: 'base-mainnet' }]),
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
      logos: { forChain: async (chain) => indexes[chain] ?? new Map() },
    });

    const body = await response.json();
    const logoById = Object.fromEntries(
      body.tokens.map((t: { id: string; logoUrl?: string }) => [t.id, t.logoUrl]),
    );
    expect(logoById).toEqual({
      [`ethereum:${usdcContract}`]: 'https://logos.test/eth-usdc.png',
      [`base:${usdcContract}`]: 'https://logos.test/base-usdc.png',
    });
  });

  it('trims and lowercases the address before calling Alchemy', async () => {
    const fetchFn = fakeAlchemy({});
    const response = await handleTokensRequest(request(`?address=%20%20${ADDRESS}%0A`), {
      apiKey: API_KEY,
      fetchFn,
    });
    expect(response.status).toBe(200);
    const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
    expect(sent.addresses[0].address).toBe(ADDRESS.toLowerCase());
  });

  it('answers the chains that loaded, names the ones that failed and skips the CDN cache', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = fakeAlchemy({
      'eth-mainnet': alchemyPage([ETH_NATIVE]),
      'arb-mainnet': 429,
      'linea-mainnet': 500,
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.tokens.map((t: { id: string }) => t.id)).toEqual(['ethereum:native']);
    expect(body.totalValueUsd).toBeCloseTo(921.644, 3);
    expect(body.failedChains).toEqual(['arbitrum', 'linea']);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(API_KEY);
  });

  it('answers 502 when every chain fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('down', { status: 503 }));

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(API_KEY);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(API_KEY);
  });

  it('redacts the API key if a network error message contains the upstream URL', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError(
        `connect ECONNREFUSED https://api.g.alchemy.com/data/v1/${API_KEY}/assets`,
      );
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    expect(response.status).toBe(502);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(API_KEY);
  });
});
