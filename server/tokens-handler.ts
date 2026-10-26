import { isValidEvmAddress } from '../shared/address';
import { CHAINS, type ChainId, type TokensResponse } from '../shared/token';
import { fetchChainTokens, fetchPricesBySymbol } from './alchemy-client';
import type { AlchemyToken } from './alchemy-types';
import { CHAIN_CONFIG } from './chains';
import type { LogoSource } from './coingecko-logos';
import {
  alchemyUsdPrice,
  buildPortfolio,
  toDecimal,
  toTokenItems,
  type LogoIndex,
} from './token-mapper';

export interface TokensHandlerDeps {
  apiKey: string | undefined;
  fetchFn?: typeof fetch;
  /** Completa os logos que a Alchemy não manda; sem ele os tokens ficam com as iniciais. */
  logos?: LogoSource;
}

/** Cache na CDN do Vercel por endereço: poupa CU da Alchemy em demos repetidas. */
export const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

interface LoadedChain {
  chain: ChainId;
  raw: AlchemyToken[];
  logos: LogoIndex | undefined;
}

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
  const redact = (error: unknown) =>
    (error instanceof Error ? error.message : String(error)).replaceAll(apiKey, '***');

  const settled = await Promise.allSettled(
    CHAINS.map(async (chain): Promise<LoadedChain> => {
      const [raw, logos] = await Promise.all([
        fetchChainTokens(address.toLowerCase(), chain, apiKey, deps.fetchFn),
        deps.logos?.forChain(chain),
      ]);
      return { chain, raw, logos };
    }),
  );

  // Uma rede fora do ar não derruba a carteira: as outras vêm, e a falha é avisada.
  const loaded: LoadedChain[] = [];
  const failedChains: ChainId[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') return void loaded.push(result.value);
    failedChains.push(CHAINS[i]);
    console.error(`Falha ao consultar a Alchemy (${CHAINS[i]}):`, redact(result.reason));
  });
  if (loaded.length === 0) {
    return Response.json({ error: 'Falha ao consultar saldos' }, { status: 502 });
  }

  const nativePrices = await fetchMissingNativePrices(loaded, apiKey, deps.fetchFn).catch(
    (error: unknown) => {
      console.warn('Preço dos tokens nativos indisponível:', redact(error));
      return new Map<string, number>();
    },
  );

  const tokens = loaded.flatMap(({ chain, raw, logos }) =>
    toTokenItems(raw, chain, logos, nativePrices.get(CHAIN_CONFIG[chain].native.symbol)),
  );
  const body: TokensResponse = buildPortfolio(tokens, failedChains);
  // Resultado parcial não vai para a CDN: o próximo acesso tenta de novo.
  const cacheControl = failedChains.length > 0 ? 'no-store' : CACHE_CONTROL;
  return Response.json(body, { headers: { 'cache-control': cacheControl } });
}

/** Uma única chamada à Prices API para os nativos com saldo que vieram sem preço. */
async function fetchMissingNativePrices(
  loaded: LoadedChain[],
  apiKey: string,
  fetchFn: typeof fetch | undefined,
): Promise<Map<string, number>> {
  const symbols = new Set(
    loaded
      .filter(({ raw }) => raw.some(isUnpricedNative))
      .map(({ chain }) => CHAIN_CONFIG[chain].native.symbol),
  );
  if (symbols.size === 0) return new Map();
  return fetchPricesBySymbol([...symbols], apiKey, fetchFn);
}

function isUnpricedNative(token: AlchemyToken): boolean {
  return (
    token.tokenAddress === null &&
    !(alchemyUsdPrice(token) > 0) &&
    toDecimal(token.tokenBalance, 18) > 0
  );
}
