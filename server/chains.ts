import type { ChainId } from '../shared/token';

/** Token nativo da rede: a Alchemy devolve o metadata dele todo `null`. Sempre 18 decimais. */
export interface NativeToken {
  symbol: string;
  name: string;
  logo: string;
}

/** O que o servidor precisa saber de cada rede. Rede nova: uma entrada aqui + `CHAINS`. */
export interface ChainConfig {
  /** Slug da rede na Alchemy (`<slug>.g.alchemy.com`, `networks` da Portfolio API). */
  alchemy: string;
  /** Slug da lista pública `tokens.coingecko.com/<slug>/all.json`. */
  coingecko: string;
  native: NativeToken;
}

/** Servido de `public/` pelo próprio app. */
const ETH: NativeToken = { symbol: 'ETH', name: 'Ether', logo: '/tokens/eth.svg' };

const COIN_IMAGES = 'https://coin-images.coingecko.com/coins/images';

export const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  ethereum: { alchemy: 'eth-mainnet', coingecko: 'ethereum', native: ETH },
  arbitrum: { alchemy: 'arb-mainnet', coingecko: 'arbitrum-one', native: ETH },
  base: { alchemy: 'base-mainnet', coingecko: 'base', native: ETH },
  optimism: { alchemy: 'opt-mainnet', coingecko: 'optimistic-ethereum', native: ETH },
  polygon: {
    alchemy: 'polygon-mainnet',
    coingecko: 'polygon-pos',
    native: {
      symbol: 'POL',
      name: 'Polygon Ecosystem Token',
      logo: `${COIN_IMAGES}/32440/small/pol.png?1759114181`,
    },
  },
  bnb: {
    alchemy: 'bnb-mainnet',
    coingecko: 'binance-smart-chain',
    native: {
      symbol: 'BNB',
      name: 'BNB',
      logo: `${COIN_IMAGES}/825/small/bnb-icon2_2x.png?1696501970`,
    },
  },
  avalanche: {
    alchemy: 'avax-mainnet',
    coingecko: 'avalanche',
    native: {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: `${COIN_IMAGES}/12559/small/Avalanche_Circle_RedWhite_Trans.png?1696512369`,
    },
  },
  zksync: { alchemy: 'zksync-mainnet', coingecko: 'zksync', native: ETH },
  linea: { alchemy: 'linea-mainnet', coingecko: 'linea', native: ETH },
  scroll: { alchemy: 'scroll-mainnet', coingecko: 'scroll', native: ETH },
  berachain: {
    alchemy: 'berachain-mainnet',
    coingecko: 'berachain',
    native: {
      symbol: 'BERA',
      name: 'Berachain',
      logo: `${COIN_IMAGES}/25235/small/BERA.png?1738822008`,
    },
  },
  zora: { alchemy: 'zora-mainnet', coingecko: 'zora-network', native: ETH },
  unichain: { alchemy: 'unichain-mainnet', coingecko: 'unichain', native: ETH },
  shape: { alchemy: 'shape-mainnet', coingecko: 'shape', native: ETH },
  monad: {
    alchemy: 'monad-mainnet',
    coingecko: 'monad',
    native: { symbol: 'MON', name: 'Monad', logo: `${COIN_IMAGES}/38927/small/mon.png?1766029057` },
  },
  hyperevm: {
    alchemy: 'hyperliquid-mainnet',
    coingecko: 'hyperevm',
    native: {
      symbol: 'HYPE',
      name: 'Hyperliquid',
      logo: `${COIN_IMAGES}/50882/small/hyperliquid.jpg?1729431300`,
    },
  },
  robinhood: { alchemy: 'robinhood-mainnet', coingecko: 'robinhood', native: ETH },
};
