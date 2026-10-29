import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChainId } from '../shared/token';
import type {
  AlchemyPricesByAddress,
  AlchemyPricesBySymbol,
  AlchemyToken,
  AlchemyTokensPage,
} from './alchemy-types';
import {
  ETH_NATIVE,
  PRICES_BY_ADDRESS,
  PRICES_BY_SYMBOL,
  RH_FAKE_USDG,
  RH_TSLA,
  RH_TSLA_CONTRACT,
  SPAM_NO_PRICE,
  USDC,
  alchemyPage,
} from './__fixtures__/alchemy-tokens';
import {
  SOL_NATIVE,
  SOL_NO_METADATA,
  SOL_SPAM,
  SOL_USDC,
  SOL_USDC_MINT,
  SOL_WALLET,
} from './__fixtures__/alchemy-solana';
import type { LendingMarket } from '../shared/lending';
import type { AaveResult, AaveSource } from './aave-source';
import { BORROW_CACHE_CONTROL, CACHE_CONTROL, handleTokensRequest } from './tokens-handler';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const API_KEY = 'secret-key';

function request(query: string): Request {
  return new Request(`https://definance.test/api/tokens${query}`);
}

/**
 * Fake da Alchemy: Tokens By Wallet responde por rede, Prices By Symbol com
 * `prices` e Prices By Address com `pricesByAddress`. Número = status HTTP de erro.
 */
function fakeAlchemy(
  byNetwork: Record<string, AlchemyTokensPage | number>,
  prices: AlchemyPricesBySymbol | number = PRICES_BY_SYMBOL,
  pricesByAddress: AlchemyPricesByAddress | number = PRICES_BY_ADDRESS,
) {
  return vi.fn<typeof fetch>(async (url, init) => {
    const reply = String(url).includes('/prices/v1/')
      ? String(url).includes('/tokens/by-address')
        ? pricesByAddress
        : prices
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

  it('rejects a 44-character non-base58 string with 400', async () => {
    const fetchFn = fakeAlchemy({});
    const response = await handleTokensRequest(request(`?address=${'z'.repeat(44)}`), {
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

  it('prices Robinhood Chain ERC-20s by contract and leaves out the ones still unpriced', async () => {
    const fetchFn = fakeAlchemy({
      'robinhood-mainnet': alchemyPage([RH_TSLA, RH_FAKE_USDG]),
    });

    const response = await handleTokensRequest(request(`?address=${ADDRESS}`), {
      apiKey: API_KEY,
      fetchFn,
    });

    const body = await response.json();
    expect(priceCalls(fetchFn)).toEqual([
      `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/by-address`,
    ]);
    expect(body.tokens.map((t: { id: string; priceUsd: number }) => [t.id, t.priceUsd])).toEqual([
      [`robinhood:${RH_TSLA_CONTRACT}`, 405.83440413306727],
    ]);
  });

  it('never asks prices by contract on chains whose ERC-20s already come priced', async () => {
    const fetchFn = fakeAlchemy({
      'eth-mainnet': alchemyPage([USDC, SPAM_NO_PRICE]),
    });

    await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });

    expect(priceCalls(fetchFn)).toEqual([]);
  });

  it('drops unpriced Robinhood Chain ERC-20s but keeps the wallet when prices by contract fail', async () => {
    const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = fakeAlchemy(
      {
        'eth-mainnet': alchemyPage([ETH_NATIVE]),
        'robinhood-mainnet': alchemyPage([RH_TSLA]),
      },
      PRICES_BY_SYMBOL,
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

  describe('Solana wallets', () => {
    const networks = (fetchFn: ReturnType<typeof fakeAlchemy>) =>
      fetchFn.mock.calls
        .filter(([url]) => !String(url).includes('/prices/v1/'))
        .map(([, init]) => JSON.parse(init!.body as string).addresses[0].networks[0]);

    it('queries only Solana for a Solana address, untouched', async () => {
      const fetchFn = fakeAlchemy({});
      await handleTokensRequest(request(`?address=${SOL_WALLET}`), { apiKey: API_KEY, fetchFn });
      expect(networks(fetchFn)).toEqual(['solana-mainnet']);
      const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
      expect(sent.addresses[0].address).toBe(SOL_WALLET);
    });

    it('never queries Solana for an EVM address', async () => {
      const fetchFn = fakeAlchemy({});
      await handleTokensRequest(request(`?address=${ADDRESS}`), { apiKey: API_KEY, fetchFn });
      expect(networks(fetchFn)).toHaveLength(17);
      expect(networks(fetchFn)).not.toContain('solana-mainnet');
    });

    it('accepts a Solana address with spaces around it', async () => {
      const fetchFn = fakeAlchemy({});
      const response = await handleTokensRequest(request(`?address=%20${SOL_WALLET}%20`), {
        apiKey: API_KEY,
        fetchFn,
      });
      expect(response.status).toBe(200);
      const sent = JSON.parse(fetchFn.mock.calls[0][1]!.body as string);
      expect(sent.addresses[0].address).toBe(SOL_WALLET);
    });

    it('returns 502 when Solana fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchFn = fakeAlchemy({ 'solana-mainnet': 503 });
      const response = await handleTokensRequest(request(`?address=${SOL_WALLET}`), {
        apiKey: API_KEY,
        fetchFn,
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: 'Falha ao consultar saldos' });
    });

    it('prices native SOL through Prices By Symbol when Alchemy sends none', async () => {
      const fetchFn = fakeAlchemy(
        { 'solana-mainnet': alchemyPage([{ ...SOL_NATIVE, tokenPrices: [] }]) },
        {
          data: [
            {
              symbol: 'SOL',
              prices: [{ currency: 'usd', value: '101.06', lastUpdatedAt: '2026-10-29T18:00:00Z' }],
            },
          ],
        },
      );
      const response = await handleTokensRequest(request(`?address=${SOL_WALLET}`), {
        apiKey: API_KEY,
        fetchFn,
      });
      expect(priceCalls(fetchFn)).toEqual([
        `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/by-symbol?symbols=SOL`,
      ]);
      const body = await response.json();
      expect(body.tokens.map((t: { id: string; priceUsd: number }) => [t.id, t.priceUsd])).toEqual([
        ['solana:native', 101.06],
      ]);
    });

    it('returns SOL and USDC from the fixture with the total and CACHE_CONTROL', async () => {
      const fetchFn = fakeAlchemy({
        'solana-mainnet': alchemyPage([SOL_NATIVE, SOL_USDC, SOL_SPAM, SOL_NO_METADATA]),
      });
      const response = await handleTokensRequest(request(`?address=${SOL_WALLET}`), {
        apiKey: API_KEY,
        fetchFn,
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL);
      const body = await response.json();
      expect(body.tokens.map((t: { id: string }) => t.id).sort()).toEqual([
        `solana:${SOL_USDC_MINT}`,
        'solana:native',
      ]);
      expect(body.totalValueUsd).toBeCloseTo(9671.242881139 * 101.06 + 33_000_000 * 0.9998, 0);
      expect(body.failedChains).toEqual([]);
    });
  });

  describe('Aave', () => {
    const USDC_KEY = 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const market = (borrowed: LendingMarket['borrowed'] = []): LendingMarket => ({
      id: 'ethereum:0xmarket',
      chain: 'ethereum',
      label: 'Aave · Ethereum',
      supplied: [],
      borrowed,
      healthFactor: borrowed.length > 0 ? 2 : null,
    });
    const debt = { underlying: '0xabc', symbol: 'DAI', name: 'Dai', balance: 1, valueUsd: 1 };
    const aave = (result: AaveResult | Error) => {
      const forUser = vi.fn<AaveSource['forUser']>(async () => {
        if (result instanceof Error) throw result;
        return result;
      });
      return { source: { forUser } as AaveSource, forUser };
    };
    const call = (source: AaveSource | undefined, address = ADDRESS, fetchFn?: typeof fetch) =>
      handleTokensRequest(request(`?address=${address}`), {
        apiKey: API_KEY,
        fetchFn:
          fetchFn ?? fakeAlchemy({ 'eth-mainnet': alchemyPage([ETH_NATIVE, USDC]) }),
        aave: source,
      });

    it('adds lending and removes aTokens for an EVM wallet', async () => {
      const markets = [market()];
      const { source } = aave({ markets, aTokens: new Set([USDC_KEY]) });
      const response = await call(source);
      const body = await response.json();
      expect(body.lending).toEqual(markets);
      expect(body.lendingFailed).toBe(false);
      expect(body.tokens.map((t: { id: string }) => t.id)).toEqual(['ethereum:native']);
      expect(body.totalValueUsd).toBeCloseTo(921.644, 3);
    });

    it('keeps aTokens and flags lendingFailed when Aave fails', async () => {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { source } = aave(new Error('aave down'));
      const response = await call(source);
      const body = await response.json();
      expect(body.lendingFailed).toBe(true);
      expect(body.lending).toEqual([]);
      expect(body.tokens.map((t: { id: string }) => t.id)).toContain(USDC_KEY);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(errorLog).toHaveBeenCalled();
    });

    it('uses BORROW_CACHE_CONTROL when any market has a borrow', async () => {
      const { source } = aave({ markets: [market([debt])], aTokens: new Set() });
      const response = await call(source);
      expect(response.headers.get('cache-control')).toBe(BORROW_CACHE_CONTROL);
    });

    it('uses CACHE_CONTROL when no market has a borrow', async () => {
      const { source } = aave({ markets: [market()], aTokens: new Set() });
      const response = await call(source);
      expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL);
    });

    it('prefers no-store over the borrow cache when a chain failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { source } = aave({ markets: [market([debt])], aTokens: new Set() });
      const response = await call(
        source,
        ADDRESS,
        fakeAlchemy({ 'eth-mainnet': alchemyPage([ETH_NATIVE]), 'arb-mainnet': 500 }),
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('never calls Aave for a Solana wallet', async () => {
      const { source, forUser } = aave({ markets: [], aTokens: new Set() });
      const response = await call(source, SOL_WALLET, fakeAlchemy({}));
      const body = await response.json();
      expect(forUser).not.toHaveBeenCalled();
      expect(body).not.toHaveProperty('lending');
      expect(body).not.toHaveProperty('lendingFailed');
    });

    it('omits lending fields for an EVM wallet without an Aave source', async () => {
      const body = await (await call(undefined)).json();
      expect(body).not.toHaveProperty('lending');
      expect(body).not.toHaveProperty('lendingFailed');
    });

    it('calls Aave with the address in the form Findings require', async () => {
      const { source, forUser } = aave({ markets: [], aTokens: new Set() });
      await call(source);
      expect(forUser).toHaveBeenCalledWith(ADDRESS.toLowerCase());
    });

    it('still returns 502 when every chain fails even if Aave succeeds', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { source } = aave({ markets: [market()], aTokens: new Set() });
      const response = await call(
        source,
        ADDRESS,
        vi.fn<typeof fetch>(async () => new Response('down', { status: 503 })),
      );
      expect(response.status).toBe(502);
    });
  });
});
