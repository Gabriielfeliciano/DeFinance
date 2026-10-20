import type { ChainId } from '../shared/token';
import type { AlchemyToken, AlchemyTokensPage } from './alchemy-types';

export const ALCHEMY_NETWORKS: Record<ChainId, string> = {
  ethereum: 'eth-mainnet',
  arbitrum: 'arb-mainnet',
  base: 'base-mainnet',
};

/** Limite de páginas por rede: protege CU e tempo de resposta em carteiras gigantes. */
export const MAX_PAGES = 5;

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
  const network = ALCHEMY_NETWORKS[chain];
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
