import type { AaveMarket, AaveMarketHealth, AaveUserBorrow, AaveUserSupply } from './aave-types';

export const AAVE_API_URL = 'https://api.v3.aave.com/graphql';

export class AaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AaveError';
  }
}

/** Chave do mapa de health factor: o mesmo endereço de mercado existe em redes distintas. */
export function healthKey(chainId: number, marketAddress: string): string {
  return `${chainId}:${marketAddress.toLowerCase()}`;
}

/** Todos os mercados v3 (com as reservas e seus aTokens) das redes pedidas. */
export async function fetchAaveMarkets(
  chainIds: number[],
  fetchFn: typeof fetch = fetch,
): Promise<AaveMarket[]> {
  const query = `{ markets(request: { chainIds: [${chainIds.join(',')}] }) {
    name address chain { chainId name }
    reserves(request: { reserveType: BOTH, orderBy: { tokenName: ASC } }) {
      underlyingToken { address symbol name decimals imageUrl }
      aToken { address }
      vToken { address }
    }
  } }`;
  const data = await graphql<{ markets: AaveMarket[] | null }>(query, fetchFn);
  if (!data.markets) throw new AaveError('markets veio vazio');
  return data.markets;
}

/** Depósitos e empréstimos da carteira nos mercados dados, numa só requisição. */
export async function fetchAaveUserPositions(
  user: string,
  markets: readonly AaveMarket[],
  fetchFn: typeof fetch = fetch,
): Promise<{ supplies: AaveUserSupply[]; borrows: AaveUserBorrow[] }> {
  if (markets.length === 0) return { supplies: [], borrows: [] };

  const items = markets.map(
    (market) => `{ address: ${JSON.stringify(market.address)}, chainId: ${market.chain.chainId} }`,
  );
  const request = `request: { markets: [${items.join(', ')}], user: ${JSON.stringify(user.toLowerCase())} }`;
  const query = `{
    userSupplies(${request}) {
      market { name chain { chainId } }
      currency { symbol address }
      balance { amount { value } usd }
      isCollateral
    }
    userBorrows(${request}) {
      market { name chain { chainId } }
      currency { symbol address }
      debt { amount { value } usd }
    }
  }`;
  const data = await graphql<{
    userSupplies: AaveUserSupply[] | null;
    userBorrows: AaveUserBorrow[] | null;
  }>(query, fetchFn);
  if (!data.userSupplies || !data.userBorrows) throw new AaveError('posições vieram vazias');
  return { supplies: data.userSupplies, borrows: data.userBorrows };
}

/**
 * Health factor por mercado, numa só chamada (`markets` com `user`).
 * Chave: `healthKey(chainId, endereço)`; `null` = sem empréstimo.
 */
export async function fetchAaveHealthFactors(
  user: string,
  markets: readonly AaveMarket[],
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, number | null>> {
  const chainIds = [...new Set(markets.map((market) => market.chain.chainId))];
  if (chainIds.length === 0) return new Map();

  const query = `{ markets(request: { chainIds: [${chainIds.join(',')}], user: ${JSON.stringify(user.toLowerCase())} }) {
    address chain { chainId } userState { healthFactor }
  } }`;
  const data = await graphql<{ markets: AaveMarketHealth[] | null }>(query, fetchFn);
  if (!data.markets) throw new AaveError('health factor veio vazio');

  const health = new Map<string, number | null>();
  for (const market of data.markets) {
    const value = market.userState?.healthFactor;
    health.set(
      healthKey(market.chain.chainId, market.address),
      value == null ? null : Number(value),
    );
  }
  return health;
}

/** Erros de GraphQL chegam com HTTP 200 e `data: null`: confere `errors` no corpo. */
async function graphql<T>(query: string, fetchFn: typeof fetch): Promise<T> {
  const response = await fetchFn(AAVE_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new AaveError(`Aave respondeu HTTP ${response.status}`);

  const body = (await response.json()) as { data?: T | null; errors?: { message: string }[] };
  if (body.errors?.length) throw new AaveError(`Aave falhou: ${body.errors[0].message}`);
  if (!body.data) throw new AaveError('Aave respondeu sem data');
  return body.data;
}
