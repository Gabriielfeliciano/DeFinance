import type { ChainId } from '../shared/token';
import type {
  AlchemyPricesByAddress,
  AlchemyPricesBySymbol,
  AlchemyToken,
  AlchemyTokenPrice,
  AlchemyTokensPage,
} from './alchemy-types';
import { CHAIN_CONFIG } from './chains';

/** Limite de páginas por rede: protege CU e tempo de resposta em carteiras gigantes. */
export const MAX_PAGES = 5;

/** Máximo de contratos por chamada ao Prices By Address (acima disso a Alchemy responde 400). */
export const MAX_PRICE_ADDRESSES = 25;

export class AlchemyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlchemyError';
  }
}

/** Busca todos os tokens (nativo + ERC-20, com metadata e preço) de uma carteira em uma rede. */
export async function fetchChainTokens(
  address: string,
  chain: ChainId,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<AlchemyToken[]> {
  const url = `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`;
  const network = CHAIN_CONFIG[chain].alchemy;
  const byToken = new Map<string, AlchemyToken>();
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address, networks: [network] }],
        withMetadata: true,
        withPrices: true,
        includeNativeTokens: true,
        includeErc20Tokens: true,
        ...(pageKey ? { pageKey } : {}),
      }),
    });
    if (!response.ok) {
      throw new AlchemyError(`${network} respondeu HTTP ${response.status}`);
    }

    const body = (await response.json()) as AlchemyTokensPage;
    if (body.error || !body.data) {
      throw new AlchemyError(`${network} falhou: ${body.error?.message ?? 'resposta sem data'}`);
    }

    for (const token of body.data.tokens) {
      byToken.set(token.tokenAddress?.toLowerCase() ?? 'native', token);
    }
    pageKey = body.data.pageKey ?? undefined;
    if (!pageKey) break;
  }

  return [...byToken.values()];
}

/** Preço em USD por símbolo (Prices API). Símbolo sem preço fica de fora do mapa. */
export async function fetchPricesBySymbol(
  symbols: readonly string[],
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, number>> {
  const query = new URLSearchParams(symbols.map((symbol) => ['symbols', symbol]));
  const response = await fetchFn(
    `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?${query}`,
  );
  if (!response.ok) {
    throw new AlchemyError(`prices by-symbol respondeu HTTP ${response.status}`);
  }

  const body = (await response.json()) as AlchemyPricesBySymbol;
  const prices = new Map<string, number>();
  for (const entry of body.data ?? []) {
    const value = usdValue(entry.prices);
    if (value > 0) prices.set(entry.symbol, value);
  }
  return prices;
}

/**
 * Preço em USD por contrato (Prices API), em lotes de `MAX_PRICE_ADDRESSES`.
 * Chave: contrato em minúsculas. Contrato sem preço fica de fora do mapa.
 */
export async function fetchPricesByAddress(
  chain: ChainId,
  contracts: readonly string[],
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, number>> {
  const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`;
  const network = CHAIN_CONFIG[chain].alchemy;
  const batches: string[][] = [];
  for (let i = 0; i < contracts.length; i += MAX_PRICE_ADDRESSES) {
    batches.push(contracts.slice(i, i + MAX_PRICE_ADDRESSES));
  }

  const pages = await Promise.all(
    batches.map(async (batch) => {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ addresses: batch.map((address) => ({ network, address })) }),
      });
      if (!response.ok) {
        throw new AlchemyError(`prices by-address respondeu HTTP ${response.status}`);
      }
      return ((await response.json()) as AlchemyPricesByAddress).data ?? [];
    }),
  );

  const prices = new Map<string, number>();
  for (const entry of pages.flat()) {
    const value = usdValue(entry.prices);
    if (value > 0) prices.set(entry.address.toLowerCase(), value);
  }
  return prices;
}

function usdValue(prices: AlchemyTokenPrice[]): number {
  return Number(prices.find((price) => price.currency.toLowerCase() === 'usd')?.value);
}
