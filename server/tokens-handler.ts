import { isValidEvmAddress } from '../shared/address';
import { CHAINS, type TokensResponse } from '../shared/token';
import { fetchChainTokens } from './alchemy-client';
import type { LogoSource } from './coingecko-logos';
import { buildPortfolio, toTokenItems } from './token-mapper';

export interface TokensHandlerDeps {
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
  /** Completa os logos que a Alchemy não manda; sem ele os tokens ficam com as iniciais. */
  logos?: LogoSource;
}

/** Cache na CDN do Vercel por endereço: poupa CU da Alchemy em demos repetidas. */
export const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

export async function handleTokensRequest(
  request: Request,
  deps: TokensHandlerDeps,
): Promise<Response> {
  const address = (new URL(request.url).searchParams.get('address') ?? '').trim();
  if (!isValidEvmAddress(address)) {
    return Response.json({ error: 'Endereço inválido' }, { status: 400 });
  }

  const apiKey = deps.apiKey;
  if (!apiKey) {
    console.error('ALCHEMY_API_KEY não configurada');
    return Response.json({ error: 'Serviço indisponível' }, { status: 500 });
  }

  try {
    const perChain = await Promise.all(
      CHAINS.map(async (chain) => {
        const [raw, logos] = await Promise.all([
          fetchChainTokens(address.toLowerCase(), chain, apiKey, deps.fetchFn),
          deps.logos?.forChain(chain),
        ]);
        return toTokenItems(raw, chain, logos);
      }),
    );
    const body: TokensResponse = buildPortfolio(perChain.flat());
    return Response.json(body, { headers: { 'cache-control': CACHE_CONTROL } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Falha ao consultar a Alchemy:', message.replaceAll(apiKey, '***'));
    return Response.json({ error: 'Falha ao consultar saldos' }, { status: 502 });
  }
}
