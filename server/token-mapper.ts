import type { ChainId, TokenItem, TokensResponse } from '../shared/token';
import type { AlchemyToken, AlchemyTokenMetadata } from './alchemy-types';
import { CHAIN_CONFIG } from './chains';

/** Abaixo disso o token é poeira: some da lista e do gráfico. */
export const MIN_VALUE_USD = 0.01;

/** Contrato em minúsculas → URL do logo. Preenche o que a Alchemy não manda. */
export type LogoIndex = ReadonlyMap<string, string>;

/** Contrato em minúsculas → preço em USD. Preenche o que a Alchemy não manda. */
export type PriceIndex = ReadonlyMap<string, number>;

/**
 * `nativePriceUsd` vale só para o token nativo e só quando a Alchemy não manda
 * o preço dele (acontece em Zora, Unichain, Shape, Monad, HyperEVM e Robinhood Chain).
 * `contractPrices` faz o mesmo para os ERC-20 (acontece na Robinhood Chain).
 */
export function toTokenItems(
  raw: AlchemyToken[],
  chain: ChainId,
  logos: LogoIndex = new Map(),
  nativePriceUsd?: number,
  contractPrices: PriceIndex = new Map(),
): TokenItem[] {
  return raw
    .map((token) => toTokenItem(token, chain, logos, nativePriceUsd, contractPrices))
    .filter((item): item is TokenItem => item !== null);
}

export function buildPortfolio(tokens: TokenItem[], failedChains: ChainId[] = []): TokensResponse {
  return {
    tokens,
    totalValueUsd: tokens.reduce((sum, token) => sum + token.valueUsd, 0),
    failedChains,
  };
}

/** Converte um saldo inteiro (hex `0x…` ou decimal) para unidades do token. */
export function toDecimal(rawBalance: string, decimals: number): number {
  try {
    return Number(BigInt(rawBalance)) / 10 ** decimals;
  } catch {
    return 0;
  }
}

/** Preço em USD que a Alchemy mandou, ou `NaN`. */
export function alchemyUsdPrice(token: AlchemyToken): number {
  const usd = token.tokenPrices?.find((price) => price.currency.toLowerCase() === 'usd');
  return Number(usd?.value);
}

/** A Alchemy devolve metadata `null` no nativo: vem do cadastro da rede. */
function nativeMetadata(chain: ChainId): AlchemyTokenMetadata {
  return { decimals: 18, ...CHAIN_CONFIG[chain].native };
}

function toTokenItem(
  token: AlchemyToken,
  chain: ChainId,
  logos: LogoIndex,
  nativePriceUsd: number | undefined,
  contractPrices: PriceIndex,
): TokenItem | null {
  const contract = token.tokenAddress?.toLowerCase();
  const meta = contract ? token.tokenMetadata : nativeMetadata(chain);
  if (token.error || !meta?.symbol || meta.decimals == null) return null;

  let priceUsd = alchemyUsdPrice(token);
  if (!(priceUsd > 0))
    priceUsd = (contract ? contractPrices.get(contract) : nativePriceUsd) ?? priceUsd;
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  const balance = toDecimal(token.tokenBalance, meta.decimals);
  const valueUsd = balance * priceUsd;
  if (!(valueUsd >= MIN_VALUE_USD)) return null;

  return {
    id: `${chain}:${contract ?? 'native'}`,
    chain,
    symbol: meta.symbol,
    name: meta.name ?? meta.symbol,
    logoUrl: meta.logo ?? (contract ? logos.get(contract) : undefined),
    balance,
    priceUsd,
    valueUsd,
  };
}
