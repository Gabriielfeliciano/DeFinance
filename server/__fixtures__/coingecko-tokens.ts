import type { CoinGeckoToken, CoinGeckoTokenList } from '../coingecko-logos';

/** Entrada real da lista `base`. */
export const AERO: CoinGeckoToken = {
  chainId: 8453,
  address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
  name: 'Aerodrome Finance',
  symbol: 'AERO',
  decimals: 18,
  logoURI: 'https://assets.coingecko.com/coins/images/31745/thumb/token.png?1696530564',
};

/** Igual à real, mas com endereço em checksum: a lista mistura maiúsculas em alguns itens. */
export const CBBTC_CHECKSUM: CoinGeckoToken = {
  chainId: 8453,
  address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  name: 'Coinbase Wrapped BTC',
  symbol: 'CBBTC',
  decimals: 8,
  logoURI: 'https://assets.coingecko.com/coins/images/40143/thumb/cbbtc.webp?1726136727',
};

export function coingeckoList(tokens: CoinGeckoToken[]): CoinGeckoTokenList {
  return {
    name: 'CoinGecko',
    logoURI: 'https://static.coingecko.com/gecko-new.svg',
    keywords: ['defi'],
    timestamp: '2026-10-22T08:04:31.389+00:00',
    version: { major: 487, minor: 7, patch: 0 },
    tokens,
  };
}
