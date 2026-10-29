import { describe, expect, it, vi } from 'vitest';
import {
  AAVE_BORROWS,
  AAVE_HEALTH,
  AAVE_MARKETS,
  AAVE_SUPPLIES,
  AAVE_USER,
} from './__fixtures__/aave';
import { AaveError } from './aave-client';
import { AAVE_MARKETS_TTL_MS, createAaveSource } from './aave-source';

/** Fake da Aave que roteia pela query; `marketsFail` derruba só a lista de mercados. */
function fakeAave(opts: { marketsFail?: () => boolean; positionsFail?: boolean } = {}) {
  return vi.fn<typeof fetch>(async (_url, init) => {
    const query = JSON.parse(init?.body as string).query as string;
    if (query.includes('userSupplies')) {
      if (opts.positionsFail) return new Response('boom', { status: 500 });
      return Response.json({ data: { userSupplies: AAVE_SUPPLIES, userBorrows: AAVE_BORROWS } });
    }
    if (query.includes('userState')) return Response.json({ data: { markets: AAVE_HEALTH } });
    if (opts.marketsFail?.()) return new Response('boom', { status: 500 });
    return Response.json({ data: { markets: AAVE_MARKETS } });
  });
}

const marketsCalls = (fetchFn: ReturnType<typeof fakeAave>) =>
  fetchFn.mock.calls.filter(([, init]) => (init?.body as string).includes('reserves(')).length;

describe('createAaveSource', () => {
  it('returns the user markets and every aToken key', async () => {
    const source = createAaveSource({ fetchFn: fakeAave() });

    const result = await source.forUser(AAVE_USER);

    expect(result.markets).toHaveLength(1);
    expect(result.aTokens.has('0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8')).toBe(true);
    expect(result.aTokens.has('0x4e65fe4dba92790696d040ac24aa414708f5c0ab')).toBe(true);
  });

  it('does not refetch markets within the TTL', async () => {
    const fetchFn = fakeAave();
    const source = createAaveSource({ fetchFn, now: () => 1_000 });

    await source.forUser(AAVE_USER);
    await source.forUser(AAVE_USER);

    expect(marketsCalls(fetchFn)).toBe(1);
  });

  it('uses the cached list when the refresh fails after the TTL', async () => {
    let t = 0;
    let failing = false;
    const fetchFn = fakeAave({ marketsFail: () => failing });
    const source = createAaveSource({ fetchFn, now: () => t });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await source.forUser(AAVE_USER);
    t = AAVE_MARKETS_TTL_MS + 1;
    failing = true;
    const result = await source.forUser(AAVE_USER);

    expect(result.markets).toHaveLength(1);
    expect(marketsCalls(fetchFn)).toBe(2);
  });

  it('rejects when markets fail and there is no cached list', async () => {
    const source = createAaveSource({ fetchFn: fakeAave({ marketsFail: () => true }) });
    await expect(source.forUser(AAVE_USER)).rejects.toBeInstanceOf(AaveError);
  });

  it('rejects when positions fail', async () => {
    const source = createAaveSource({ fetchFn: fakeAave({ positionsFail: true }) });
    await expect(source.forUser(AAVE_USER)).rejects.toBeInstanceOf(AaveError);
  });
});
