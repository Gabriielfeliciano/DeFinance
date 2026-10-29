import { afterEach, describe, expect, it, vi } from 'vitest';
import { AERO, CBBTC_CHECKSUM, coingeckoList } from './__fixtures__/coingecko-tokens';
import { LOGO_TTL_MS, createCoinGeckoLogos, type CoinGeckoToken } from './coingecko-logos';

const AERO_ADDRESS = '0x940181a94a35a4569e4529a3cdfb74e38fd98631';
const CBBTC_ADDRESS = '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf';

/** Fake da CoinGecko que responde a mesma lista para qualquer rede. */
function fakeCoinGecko(body: unknown = coingeckoList([AERO])) {
  return vi.fn<typeof fetch>(async () => Response.json(body));
}

describe('createCoinGeckoLogos', () => {
  afterEach(() => vi.restoreAllMocks());

  it('indexes logos by lowercased contract, using the 50px image', async () => {
    const logos = createCoinGeckoLogos({
      fetchFn: fakeCoinGecko(coingeckoList([AERO, CBBTC_CHECKSUM])),
    });

    const index = await logos.forChain('base');

    expect(index.get(AERO_ADDRESS)).toBe(
      'https://assets.coingecko.com/coins/images/31745/small/token.png?1696530564',
    );
    expect(index.get(CBBTC_ADDRESS)).toBe(
      'https://assets.coingecko.com/coins/images/40143/small/cbbtc.webp?1726136727',
    );
  });

  it.each([
    ['ethereum', 'https://tokens.coingecko.com/ethereum/all.json'],
    ['arbitrum', 'https://tokens.coingecko.com/arbitrum-one/all.json'],
    ['base', 'https://tokens.coingecko.com/base/all.json'],
    ['optimism', 'https://tokens.coingecko.com/optimistic-ethereum/all.json'],
    ['polygon', 'https://tokens.coingecko.com/polygon-pos/all.json'],
    ['bnb', 'https://tokens.coingecko.com/binance-smart-chain/all.json'],
    ['zora', 'https://tokens.coingecko.com/zora-network/all.json'],
    ['hyperevm', 'https://tokens.coingecko.com/hyperevm/all.json'],
    ['robinhood', 'https://tokens.coingecko.com/robinhood/all.json'],
  ] as const)('requests the %s list from CoinGecko', async (chain, url) => {
    const fetchFn = fakeCoinGecko();
    await createCoinGeckoLogos({ fetchFn }).forChain(chain);
    expect(fetchFn.mock.calls[0][0]).toBe(url);
  });

  it('reuses a chain list for 30 minutes, then refreshes it', async () => {
    let clock = 0;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(coingeckoList([AERO])))
      .mockResolvedValueOnce(Response.json(coingeckoList([CBBTC_CHECKSUM])));
    const logos = createCoinGeckoLogos({ fetchFn, now: () => clock });

    await logos.forChain('base');
    clock = LOGO_TTL_MS - 1;
    expect((await logos.forChain('base')).has(AERO_ADDRESS)).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clock = LOGO_TTL_MS;
    const refreshed = await logos.forChain('base');
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(refreshed.has(CBBTC_ADDRESS)).toBe(true);
  });

  it('keeps a separate list per chain', async () => {
    const fetchFn = vi.fn<typeof fetch>(async (url) =>
      Response.json(coingeckoList(String(url).includes('/base/') ? [AERO] : [])),
    );
    const logos = createCoinGeckoLogos({ fetchFn });

    await logos.forChain('base');
    const ethereum = await logos.forChain('ethereum');

    expect(ethereum.has(AERO_ADDRESS)).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['an HTTP error', async () => new Response('rate limited', { status: 429 })],
    ['a network error', async () => Promise.reject(new TypeError('fetch failed'))],
    ['a body without tokens', async () => Response.json({ error: 'not found' })],
  ])('returns an empty index on %s', async (_case, reply: () => Promise<Response>) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logos = createCoinGeckoLogos({ fetchFn: vi.fn<typeof fetch>(reply) });

    expect((await logos.forChain('base')).size).toBe(0);
  });

  it('keeps serving the last list when a refresh fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let clock = 0;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(coingeckoList([AERO])))
      .mockResolvedValueOnce(new Response('down', { status: 503 }));
    const logos = createCoinGeckoLogos({ fetchFn, now: () => clock });

    await logos.forChain('base');
    clock = LOGO_TTL_MS;

    expect((await logos.forChain('base')).has(AERO_ADDRESS)).toBe(true);
  });

  it('retries on the next call after a failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValueOnce(Response.json(coingeckoList([AERO])));
    const logos = createCoinGeckoLogos({ fetchFn });

    await logos.forChain('base');

    expect((await logos.forChain('base')).has(AERO_ADDRESS)).toBe(true);
  });

  it('gives up on a list that takes longer than the timeout', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Só termina se alguém abortar: sem timeout, o teste estoura o limite do Vitest.
    const hanging = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
        }),
    );
    const logos = createCoinGeckoLogos({ fetchFn: hanging, timeoutMs: 10 });

    expect((await logos.forChain('base')).size).toBe(0);
  });
});

describe('createCoinGeckoLogos (case)', () => {
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const SPL = {
    chainId: null,
    address: USDC_MINT,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/usdc.png',
  } as unknown as CoinGeckoToken;

  it('keeps the mint case in the solana index', async () => {
    const index = await createCoinGeckoLogos({
      fetchFn: fakeCoinGecko(coingeckoList([SPL])),
    }).forChain('solana');
    expect(index.get(USDC_MINT)).toBe(
      'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    );
    expect(index.has(USDC_MINT.toLowerCase())).toBe(false);
  });

  it('still lowercases the EVM index', async () => {
    const index = await createCoinGeckoLogos({
      fetchFn: fakeCoinGecko(coingeckoList([CBBTC_CHECKSUM])),
    }).forChain('base');
    expect(index.has(CBBTC_ADDRESS)).toBe(true);
    expect(index.has(CBBTC_CHECKSUM.address)).toBe(false);
  });
});
