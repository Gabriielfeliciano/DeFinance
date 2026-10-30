import { CHAIN_LABELS, type ChainId } from '../shared/token';

/** Token nativo da rede: a Alchemy devolve o metadata dele todo `null`. 18 decimais, salvo se `decimals` disser outro valor. */
export interface NativeToken {
  symbol: string;
  name: string;
  logo: string;
  /** Ausente = 18. */
  decimals?: number;
}

/** O que o servidor precisa saber de cada rede. Rede nova: uma entrada aqui + `CHAINS`. */
export interface ChainConfig {
  /** Slug da rede na Alchemy (`<slug>.g.alchemy.com`, `networks` da Portfolio API). */
  alchemy: string;
  /** Slug da lista pública `tokens.coingecko.com/<slug>/all.json`. */
  coingecko: string;
  native: NativeToken;
  /** A Portfolio API manda os tokens de contrato (ERC-20/SPL) desta rede sem preço: ele vem da Prices API, por contrato. */
  erc20PricesByAddress?: boolean;
  /** Id numérico da rede na API da Aave; só nas redes com mercado Aave v3. */
  chainId?: number;
  /** Trecho da rede no nome do mercado Aave (`Ethereum` em `AaveV3EthereumLido`). */
  aaveName?: string;
}

/** Servido de `public/` pelo próprio app. */
const ETH: NativeToken = { symbol: 'ETH', name: 'Ether', logo: '/tokens/eth.svg' };

const COIN_IMAGES = 'https://coin-images.coingecko.com/coins/images';

export const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  ethereum: {
    alchemy: 'eth-mainnet',
    coingecko: 'ethereum',
    native: ETH,
    chainId: 1,
    aaveName: 'Ethereum',
  },
  arbitrum: {
    alchemy: 'arb-mainnet',
    coingecko: 'arbitrum-one',
    native: ETH,
    chainId: 42161,
    aaveName: 'Arbitrum',
  },
  base: {
    alchemy: 'base-mainnet',
    coingecko: 'base',
    native: ETH,
    chainId: 8453,
    aaveName: 'Base',
  },
  optimism: {
    alchemy: 'opt-mainnet',
    coingecko: 'optimistic-ethereum',
    native: ETH,
    chainId: 10,
    aaveName: 'Optimism',
  },
  polygon: {
    alchemy: 'polygon-mainnet',
    coingecko: 'polygon-pos',
    native: {
      symbol: 'POL',
      name: 'Polygon Ecosystem Token',
      logo: `${COIN_IMAGES}/32440/small/pol.png?1759114181`,
    },
    chainId: 137,
    aaveName: 'Polygon',
  },
  bnb: {
    alchemy: 'bnb-mainnet',
    coingecko: 'binance-smart-chain',
    native: {
      symbol: 'BNB',
      name: 'BNB',
      logo: `${COIN_IMAGES}/825/small/bnb-icon2_2x.png?1696501970`,
    },
    chainId: 56,
    aaveName: 'BNB',
  },
  avalanche: {
    alchemy: 'avax-mainnet',
    coingecko: 'avalanche',
    native: {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: `${COIN_IMAGES}/12559/small/Avalanche_Circle_RedWhite_Trans.png?1696512369`,
    },
    chainId: 43114,
    aaveName: 'Avalanche',
  },
  zksync: {
    alchemy: 'zksync-mainnet',
    coingecko: 'zksync',
    native: ETH,
    chainId: 324,
    aaveName: 'ZkSync',
  },
  linea: {
    alchemy: 'linea-mainnet',
    coingecko: 'linea',
    native: ETH,
    chainId: 59144,
    aaveName: 'Linea',
  },
  scroll: {
    alchemy: 'scroll-mainnet',
    coingecko: 'scroll',
    native: ETH,
    chainId: 534352,
    aaveName: 'Scroll',
  },
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
    chainId: 143,
    aaveName: 'Monad',
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
  robinhood: {
    alchemy: 'robinhood-mainnet',
    coingecko: 'robinhood',
    native: ETH,
    erc20PricesByAddress: true,
  },
  solana: {
    alchemy: 'solana-mainnet',
    coingecko: 'solana',
    native: {
      symbol: 'SOL',
      name: 'Solana',
      logo: `${COIN_IMAGES}/4128/small/solana.png`,
      decimals: 9,
    },
  },
};

/** Chave de um contrato nos índices: o mint da Solana é case-sensitive, o EVM vai em minúsculas. */
export function contractKey(chain: ChainId, address: string): string {
  return chain === 'solana' ? address : address.toLowerCase();
}

/** Rótulo do mercado Aave: `AaveV3EthereumLido` na Ethereum vira `Aave · Ethereum Lido`. */
export function aaveMarketLabel(chain: ChainId, marketName: string): string {
  const base = `Aave · ${CHAIN_LABELS[chain]}`;
  const unversioned = marketName.replace(/^AaveV3/, '');
  const prefix = CHAIN_CONFIG[chain].aaveName ?? '';
  const suffix =
    prefix && unversioned.startsWith(prefix) ? unversioned.slice(prefix.length) : unversioned;
  return suffix ? `${base} ${suffix}` : base;
}
