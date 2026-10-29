import { describe, expect, it } from 'vitest';
import { AAVE_BORROWS, AAVE_HEALTH, AAVE_MARKETS, AAVE_SUPPLIES } from './__fixtures__/aave';
import { healthKey } from './aave-client';
import { toLendingMarkets } from './aave-mapper';
import type { AaveMarket } from './aave-types';

const health = new Map(
  AAVE_HEALTH.map((m) => [
    healthKey(m.chain.chainId, m.address),
    m.userState?.healthFactor == null ? null : Number(m.userState.healthFactor),
  ]),
);

describe('toLendingMarkets', () => {
  it('maps the real fixture to one Ethereum market', () => {
    const [market, ...rest] = toLendingMarkets(AAVE_MARKETS, AAVE_SUPPLIES, AAVE_BORROWS, health);

    expect(rest).toEqual([]);
    expect(market).toMatchObject({
      id: 'ethereum:0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
      chain: 'ethereum',
      label: 'Aave · Ethereum',
    });
    expect(market.supplied).toEqual([
      {
        underlying: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        logoUrl: expect.stringContaining('WBTC'),
        balance: 3.03841532,
        valueUsd: Number('245063.9511508335303352'),
      },
    ]);
    expect(market.borrowed).toMatchObject([
      { symbol: 'USDC', balance: 150660.21637, valueUsd: Number('150631.8274654294009') },
    ]);
    expect(market.healthFactor).toBeCloseTo(1.38291, 4);
  });

  it('gives healthFactor null to a market without borrows', () => {
    const markets = toLendingMarkets(AAVE_MARKETS, AAVE_SUPPLIES, [], health);
    expect(markets).toHaveLength(1);
    expect(markets[0].healthFactor).toBeNull();
  });

  it('keeps health factors of markets sharing an address on different chains apart', () => {
    const twin: AaveMarket = {
      ...AAVE_MARKETS[0],
      name: 'AaveV3Base',
      chain: { chainId: 8453, name: 'Base' },
    };
    const where = { name: 'AaveV3Base', chain: { chainId: 8453 } };
    const map = new Map([
      [healthKey(1, twin.address), 9],
      [healthKey(8453, twin.address), 2],
    ]);

    const [market] = toLendingMarkets(
      [twin],
      [{ ...AAVE_SUPPLIES[0], market: where }],
      [{ ...AAVE_BORROWS[0], market: where }],
      map,
    );

    expect(market.healthFactor).toBe(2);
  });

  it('drops markets on chains the app does not cover', () => {
    const unknown: AaveMarket = { ...AAVE_MARKETS[0], chain: { chainId: 100, name: 'Gnosis' } };
    const supply = { ...AAVE_SUPPLIES[0], market: { name: unknown.name, chain: { chainId: 100 } } };
    expect(toLendingMarkets([unknown], [supply], [], health)).toEqual([]);
  });

  it('drops dust and sorts assets by value', () => {
    const usdc = AAVE_MARKETS[0].reserves[0].underlyingToken.address;
    const base = { ...AAVE_SUPPLIES[0], currency: { symbol: 'USDC', address: usdc } };
    const dust = { ...base, balance: { amount: { value: '0.001' }, usd: '0.001' } };
    const small = { ...base, balance: { amount: { value: '5' }, usd: '5' } };

    const [market] = toLendingMarkets(AAVE_MARKETS, [dust, small, AAVE_SUPPLIES[0]], [], health);

    expect(market.supplied.map((asset) => asset.symbol)).toEqual(['WBTC', 'USDC']);
  });

  it('skips markets whose only positions are dust', () => {
    const dust = { ...AAVE_SUPPLIES[0], balance: { amount: { value: '0' }, usd: '0' } };
    expect(toLendingMarkets(AAVE_MARKETS, [dust], [], health)).toEqual([]);
  });
});
