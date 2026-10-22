import type { ChainId, TokenItem, TokensResponse } from '../shared/token';
import type { AlchemyToken, AlchemyTokenMetadata } from './alchemy-types';

/** Abaixo disso o token é poeira: some da lista e do gráfico. */
export const MIN_VALUE_USD = 0.01;

/** A Alchemy devolve metadata `null` no nativo; Ethereum, Arbitrum e Base usam ETH. */
const NATIVE_METADATA: AlchemyTokenMetadata = {
  decimals: 18,
  /** Servido de `public/` pelo próprio app. */
  logo: '/tokens/eth.svg',
  name: 'Ether',
  symbol: 'ETH',
};

/** Contrato em minúsculas → URL do logo. Preenche o que a Alchemy não manda. */
export type LogoIndex = ReadonlyMap<string, string>;

export function toTokenItems(
  raw: AlchemyToken[],
  chain: ChainId,
  logos: LogoIndex = new Map(),
): TokenItem[] {
  return raw
    .map((token) => toTokenItem(token, chain, logos))
    .filter((item): item is TokenItem => item !== null);
}

export function buildPortfolio(tokens: TokenItem[]): TokensResponse {
  return { tokens, totalValueUsd: tokens.reduce((sum, token) => sum + token.valueUsd, 0) };
}

/** Converte um saldo inteiro (hex `0x…` ou decimal) para unidades do token. */
export function toDecimal(rawBalance: string, decimals: number): number {
  try {
    return Number(BigInt(rawBalance)) / 10 ** decimals;
  } catch {
    return 0;
  }
}

function toTokenItem(token: AlchemyToken, chain: ChainId, logos: LogoIndex): TokenItem | null {
  const meta = token.tokenAddress === null ? NATIVE_METADATA : token.tokenMetadata;
  if (token.error || !meta?.symbol || meta.decimals == null) return null;

  const usd = token.tokenPrices?.find((price) => price.currency.toLowerCase() === 'usd');
  const priceUsd = Number(usd?.value);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  const balance = toDecimal(token.tokenBalance, meta.decimals);
  const valueUsd = balance * priceUsd;
  if (!(valueUsd >= MIN_VALUE_USD)) return null;

  const contract = token.tokenAddress?.toLowerCase();
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
