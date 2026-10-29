import { addressKind, type AddressKind } from '../shared/address';
import { EVM_CHAINS, type ChainId, type TokensResponse } from '../shared/token';
import { fetchChainTokens, fetchPricesByAddress, fetchPricesBySymbol } from './alchemy-client';
import type { AlchemyToken } from './alchemy-types';
import { CHAIN_CONFIG, contractKey } from './chains';
import type { LogoSource } from './coingecko-logos';
import {
  alchemyUsdPrice,
  buildPortfolio,
  toDecimal,
  toTokenItems,
  type LogoIndex,
  type PriceIndex,
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

/** Redes consultadas para cada tipo de endereço: um endereço EVM nunca vai à Solana e vice-versa. */
function chainsFor(kind: AddressKind): readonly ChainId[] {
  return kind === 'solana' ? ['solana'] : EVM_CHAINS;
}

export async function handleTokensRequest(
  request: Request,
  deps: TokensHandlerDeps,
): Promise<Response> {
  const address = (new URL(request.url).searchParams.get('address') ?? '').trim();
  const kind = addressKind(address);
  if (!kind) {
    return Response.json({ error: 'Endereço inválido' }, { status: 400 });
  }

  const apiKey = deps.apiKey;
  if (!apiKey) {
    console.error('ALCHEMY_API_KEY não configurada');
    return Response.json({ error: 'Serviço indisponível' }, { status: 500 });
  }
  const redact = (error: unknown) =>
    (error instanceof Error ? error.message : String(error)).replaceAll(apiKey, '***');

  // Base58 diferencia maiúsculas: só o EVM é normalizado para minúsculas.
  const walletAddress = kind === 'evm' ? address.toLowerCase() : address;
  const chains = chainsFor(kind);
  const settled = await Promise.allSettled(
    chains.map(async (chain): Promise<LoadedChain> => {
      const [raw, logos] = await Promise.all([
        fetchChainTokens(walletAddress, chain, apiKey, deps.fetchFn),
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
    failedChains.push(chains[i]);
    console.error(`Falha ao consultar a Alchemy (${chains[i]}):`, redact(result.reason));
  });
  if (loaded.length === 0) {
    return Response.json({ error: 'Falha ao consultar saldos' }, { status: 502 });
  }

  const [nativePrices, contractPrices] = await Promise.all([
    fetchMissingNativePrices(loaded, apiKey, deps.fetchFn).catch((error: unknown) => {
      console.warn('Preço dos tokens nativos indisponível:', redact(error));
      return new Map<string, number>();
    }),
    fetchMissingContractPrices(loaded, apiKey, deps.fetchFn, redact),
  ]);

  const tokens = loaded.flatMap(({ chain, raw, logos }) =>
    toTokenItems(
      raw,
      chain,
      logos,
      nativePrices.get(CHAIN_CONFIG[chain].native.symbol),
      contractPrices.get(chain),
    ),
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
      .filter(({ chain, raw }) => raw.some((token) => isUnpricedNative(token, chain)))
      .map(({ chain }) => CHAIN_CONFIG[chain].native.symbol),
  );
  if (symbols.size === 0) return new Map();
  return fetchPricesBySymbol([...symbols], apiKey, fetchFn);
}

/**
 * Nas redes `erc20PricesByAddress`, os ERC-20 com saldo vão à Prices API por
 * contrato. O que continuar sem preço (spam) fica fora da carteira.
 */
async function fetchMissingContractPrices(
  loaded: LoadedChain[],
  apiKey: string,
  fetchFn: typeof fetch | undefined,
  redact: (error: unknown) => string,
): Promise<Map<ChainId, PriceIndex>> {
  const entries = await Promise.all(
    loaded
      .filter(({ chain }) => CHAIN_CONFIG[chain].erc20PricesByAddress)
      .map(async ({ chain, raw }): Promise<[ChainId, PriceIndex]> => {
        const contracts = raw
          .filter(isUnpricedErc20)
          .map((token) => contractKey(chain, token.tokenAddress!));
        if (contracts.length === 0) return [chain, new Map()];
        const prices = await fetchPricesByAddress(chain, contracts, apiKey, fetchFn).catch(
          (error: unknown) => {
            console.warn(`Preço dos ERC-20 indisponível (${chain}):`, redact(error));
            return new Map<string, number>();
          },
        );
        return [chain, prices];
      }),
  );
  return new Map(entries);
}

function isUnpricedErc20(token: AlchemyToken): boolean {
  return (
    token.tokenAddress !== null &&
    !(alchemyUsdPrice(token) > 0) &&
    toDecimal(token.tokenBalance, token.tokenMetadata?.decimals ?? 18) > 0
  );
}

function isUnpricedNative(token: AlchemyToken, chain: ChainId): boolean {
  return (
    token.tokenAddress === null &&
    !(alchemyUsdPrice(token) > 0) &&
    toDecimal(token.tokenBalance, CHAIN_CONFIG[chain].native.decimals ?? 18) > 0
  );
}
