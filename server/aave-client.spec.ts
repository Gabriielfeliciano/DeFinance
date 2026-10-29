import { describe, expect, it, vi } from 'vitest';
import {
  AAVE_BORROWS,
  AAVE_HEALTH,
  AAVE_MARKETS,
  AAVE_SUPPLIES,
  AAVE_USER,
} from './__fixtures__/aave';
import {
  AAVE_API_URL,
  AaveError,
  fetchAaveHealthFactors,
  fetchAaveMarkets,
  fetchAaveUserPositions,
  healthKey,
} from './aave-client';

function fakeAave(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

const queryOf = (fetchFn: ReturnType<typeof fakeAave>) =>
  JSON.parse(fetchFn.mock.calls[0][1]?.body as string).query as string;

describe('fetchAaveMarkets', () => {
  it('posts the markets query to the Aave API', async () => {
    const fetchFn = fakeAave({ data: { markets: AAVE_MARKETS } });

    expect(await fetchAaveMarkets([1, 8453], fetchFn)).toEqual(AAVE_MARKETS);

    expect(AAVE_API_URL).toBe('https://api.v3.aave.com/graphql');
    expect(fetchFn.mock.calls[0][0]).toBe(AAVE_API_URL);
    expect(queryOf(fetchFn)).toContain('chainIds: [1,8453]');
    expect(queryOf(fetchFn)).toContain('aToken { address }');
  });

  it('throws AaveError on HTTP 500', async () => {
    await expect(fetchAaveMarkets([1], fakeAave({}, 500))).rejects.toBeInstanceOf(AaveError);
  });

  it('throws AaveError on a GraphQL error answered with HTTP 200', async () => {
    const fetchFn = fakeAave({ data: null, errors: [{ message: 'Unknown field "nope"' }] });
    await expect(fetchAaveMarkets([1], fetchFn)).rejects.toThrow(/Unknown field/);
  });

  it('throws AaveError when the body has no data', async () => {
    await expect(fetchAaveMarkets([1], fakeAave({}))).rejects.toBeInstanceOf(AaveError);
  });
});

describe('fetchAaveUserPositions', () => {
  it('asks for supplies and borrows in one request with the lowercased user', async () => {
    const fetchFn = fakeAave({ data: { userSupplies: AAVE_SUPPLIES, userBorrows: AAVE_BORROWS } });
    const checksummed = '0x970A959fF873efE333F0153b1cDCAc853f41c425';

    const result = await fetchAaveUserPositions(checksummed, AAVE_MARKETS, fetchFn);

    expect(result).toEqual({ supplies: AAVE_SUPPLIES, borrows: AAVE_BORROWS });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const query = queryOf(fetchFn);
    expect(query).toContain('userSupplies');
    expect(query).toContain('userBorrows');
    expect(query).toContain(`user: "${AAVE_USER}"`);
    expect(query).toContain('chainId: 8453');
  });

  it('does not call the API without markets', async () => {
    const fetchFn = fakeAave({});
    expect(await fetchAaveUserPositions(AAVE_USER, [], fetchFn)).toEqual({
      supplies: [],
      borrows: [],
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws AaveError when the positions come back null', async () => {
    const fetchFn = fakeAave({ data: { userSupplies: null, userBorrows: [] } });
    await expect(fetchAaveUserPositions(AAVE_USER, AAVE_MARKETS, fetchFn)).rejects.toBeInstanceOf(
      AaveError,
    );
  });
});

describe('fetchAaveHealthFactors', () => {
  it('keys chain + market address to the health factor, in a single call', async () => {
    const fetchFn = fakeAave({ data: { markets: AAVE_HEALTH } });

    const health = await fetchAaveHealthFactors(AAVE_USER, AAVE_MARKETS, fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(health.get(healthKey(1, '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2'))).toBeCloseTo(
      1.38291,
      4,
    );
    expect(health.get(healthKey(8453, AAVE_MARKETS[1].address))).toBeNull();
  });

  it('throws AaveError on HTTP 500', async () => {
    await expect(
      fetchAaveHealthFactors(AAVE_USER, AAVE_MARKETS, fakeAave({}, 500)),
    ).rejects.toBeInstanceOf(AaveError);
  });
});
