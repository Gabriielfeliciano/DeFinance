import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AlchemyTokensPage } from './alchemy-types';
import { ETH_NATIVE, USDC, alchemyPage } from './__fixtures__/alchemy-tokens';
import { CACHE_CONTROL, handleTokensRequest } from './tokens-handler';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const API_KEY = 'secret-key';

function request(query: string): Request {
  return new Request(`https://definance.test/api/tokens${query}`);
}

/** Fake da Alchemy que responde por rede; número = status HTTP de erro. */
function fakeAlchemy(byNetwork: Record<string, AlchemyTokensPage | number>) {
  return vi.fn<typeof fetch>(async (_url, init) => {
    const network: string = JSON.parse(init!.body as string).addresses[0].networks[0];
    const reply = byNetwork[network] ?? alchemyPage([]);
    if (typeof reply === 'number') return new Response('upstream error', { status: reply });
    return Response.json(reply);
  });
}

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

  it('aggregates the three chains into one cached response', async () => {
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
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(body.tokens.map((t: { id: string }) => t.id).sort()).toEqual([
      'base:native',
      'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'ethereum:native',
    ]);
    expect(body.totalValueUsd).toBeCloseTo(921.644 * 2 + 99.98, 2);
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

  it('answers 502 when any chain fails, never a partial total', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = fakeAlchemy({ 'eth-mainnet': alchemyPage([ETH_NATIVE]), 'arb-mainnet': 429 });

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
