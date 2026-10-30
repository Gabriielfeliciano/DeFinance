import type { LendingAsset, LendingMarket } from '../shared/lending';
import type { ChainId } from '../shared/token';
import { AaveError, healthKey } from './aave-client';
import type { AaveMarket, AaveUserBorrow, AaveUserSupply } from './aave-types';
import { CHAIN_CONFIG, aaveMarketLabel } from './chains';
import { MIN_VALUE_USD } from './token-mapper';

/** Rede do app a partir do chainId da Aave; `undefined` se o app não cobre a rede. */
export function chainFromAaveId(chainId: number): ChainId | undefined {
  return (Object.keys(CHAIN_CONFIG) as ChainId[]).find(
    (chain) => CHAIN_CONFIG[chain].chainId === chainId,
  );
}

interface Position {
  market: { name: string; chain: { chainId: number } };
  currency: { symbol: string; address: string };
  amount: string;
  usd: string;
}

/**
 * Junta mercados, posições e health factor em `LendingMarket[]`.
 * Só entram mercados com posição, em redes que o app cobre; ativos abaixo de
 * `MIN_VALUE_USD` são descartados e cada lista sai do maior valor para o menor.
 */
export function toLendingMarkets(
  markets: readonly AaveMarket[],
  supplies: readonly AaveUserSupply[],
  borrows: readonly AaveUserBorrow[],
  health: Map<string, number | null>,
): LendingMarket[] {
  const supplyPositions: Position[] = supplies.map((s) => ({
    ...s,
    amount: s.balance.amount.value,
    usd: s.balance.usd,
  }));
  const borrowPositions: Position[] = borrows.map((b) => ({
    ...b,
    amount: b.debt.amount.value,
    usd: b.debt.usd,
  }));

  const result: LendingMarket[] = [];
  for (const market of markets) {
    const chain = chainFromAaveId(market.chain.chainId);
    if (!chain) continue;

    const supplied = assetsOf(market, supplyPositions);
    const borrowed = assetsOf(market, borrowPositions);
    if (supplied.length === 0 && borrowed.length === 0) continue;

    // Decide pelo bruto: dívida abaixo do piso de poeira ainda tem health factor.
    const hasBorrow = borrowPositions.some((position) => isIn(market, position));
    let factor: number | null = null;
    if (hasBorrow) {
      const value = health.get(healthKey(market.chain.chainId, market.address));
      // Ausente, nulo ou inválido com empréstimo nunca vira "sem empréstimo" nem verde.
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new AaveError(`health factor inválido para ${market.name}`);
      }
      factor = value;
    }
    result.push({
      id: `${chain}:${market.address.toLowerCase()}`,
      chain,
      label: aaveMarketLabel(chain, market.name),
      supplied,
      borrowed,
      healthFactor: factor,
    });
  }
  return result;
}

function isIn(market: AaveMarket, position: Position): boolean {
  return (
    position.market.chain.chainId === market.chain.chainId && position.market.name === market.name
  );
}

function assetsOf(market: AaveMarket, positions: readonly Position[]): LendingAsset[] {
  const assets: LendingAsset[] = [];
  for (const position of positions) {
    if (!isIn(market, position)) continue;

    const valueUsd = Number(position.usd);
    if (!(valueUsd >= MIN_VALUE_USD)) continue;

    const underlying = position.currency.address.toLowerCase();
    const token = market.reserves.find(
      (reserve) => reserve.underlyingToken.address.toLowerCase() === underlying,
    )?.underlyingToken;
    assets.push({
      underlying,
      symbol: position.currency.symbol,
      name: token?.name ?? position.currency.symbol,
      ...(token?.imageUrl ? { logoUrl: token.imageUrl } : {}),
      balance: Number(position.amount),
      valueUsd,
    });
  }
  return assets.sort((a, b) => b.valueUsd - a.valueUsd);
}
