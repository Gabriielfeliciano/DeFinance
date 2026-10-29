import type { AlchemyPricesByAddress, AlchemyToken } from '../alchemy-types';

/**
 * Carteira pública real (Portfolio API, `solana-mainnet`, 2026-10-29). Os
 * tokens abaixo são cortes da resposta real; a Alchemy também manda
 * `scaledTokenBalance` nos SPL, omitido aqui porque o tipo não o usa.
 */
export const SOL_WALLET = '81w96XvKAZZFmmuzaohSQUyxtGnAPJmkjwoBFBmtytUj';

export const SOL_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL_PYUSD_MINT = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

/** 9671.242881139 SOL (lamports, 9 decimais) a US$ 101.06. Como nas EVM: `tokenAddress` nulo e metadata toda nula. */
export const SOL_NATIVE: AlchemyToken = {
  address: SOL_WALLET,
  network: 'solana-mainnet',
  tokenAddress: null,
  tokenBalance: '0x000000000000000000000000000000000000000000000000000008cbc2ff1873',
  tokenMetadata: { symbol: null, decimals: null, name: null, logo: null },
  tokenPrices: [{ currency: 'usd', value: '101.06', lastUpdatedAt: '2026-10-29T18:03:42.970Z' }],
};

/** 33.000.000 USDC (6 decimais) a US$ 0.9998, com metadata e logo vindos da Alchemy. */
export const SOL_USDC: AlchemyToken = {
  address: SOL_WALLET,
  network: 'solana-mainnet',
  tokenAddress: SOL_USDC_MINT,
  tokenBalance: '0x00000000000000000000000000000000000000000000000000001e0369471000',
  tokenMetadata: {
    decimals: 6,
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    name: 'USD Coin',
    symbol: 'USDC',
  },
  tokenPrices: [{ currency: 'usd', value: '0.9998', lastUpdatedAt: '2026-10-29T18:03:10.290Z' }],
};

/** 10 "ՍՏDТ" (USDT falso com letras armênias/cirílicas), sem preço: spam, fica de fora. */
export const SOL_SPAM: AlchemyToken = {
  address: SOL_WALLET,
  network: 'solana-mainnet',
  tokenAddress: '4va7fueZLaejBzrQetfn6t1VoZTSAJeDx4qbcvNc4o5D',
  tokenBalance: '0x0000000000000000000000000000000000000000000000000000000000989680',
  tokenMetadata: {
    decimals: 6,
    logo: 'https://gateway.pinata.cloud/ipfs/bafkreibn4y6llleughtp5pgu37lve7mymvcffpo5i2h6iw4t4iwo6z5ocu',
    name: 'ՍՏDТ',
    symbol: 'ՍՏDТ',
  },
  tokenPrices: [],
};

/** 88.77 de um SPL com metadata toda nula e sem preço (também não está na lista da CoinGecko): fica de fora. */
export const SOL_NO_METADATA: AlchemyToken = {
  address: SOL_WALLET,
  network: 'solana-mainnet',
  tokenAddress: 'USDai5XCUzNebYzUk6EuRiFCvnyoyEdj7VSyijYcz2A',
  tokenBalance: '0x00000000000000000000000000000000000000000000000000000000054a85d0',
  tokenMetadata: { symbol: null, decimals: null, name: null, logo: null },
  tokenPrices: [],
};

/** Shape real do Prices By Address na Solana: o mint volta com a caixa intacta; PYUSD não tem preço. */
export const SOL_PRICES_BY_ADDRESS: AlchemyPricesByAddress = {
  data: [
    {
      network: 'solana-mainnet',
      address: SOL_USDC_MINT,
      prices: [{ currency: 'usd', value: '0.9998', lastUpdatedAt: '2026-10-29T18:03:10.290Z' }],
    },
    {
      network: 'solana-mainnet',
      address: SOL_PYUSD_MINT,
      prices: [],
      error: { message: `Price not found for solana-mainnet:${SOL_PYUSD_MINT}` },
    },
  ],
};
