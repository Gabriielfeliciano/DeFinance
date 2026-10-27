import type {
  AlchemyPricesByAddress,
  AlchemyPricesBySymbol,
  AlchemyToken,
  AlchemyTokensPage,
} from '../alchemy-types';

const WALLET = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const PRICED_AT = '2025-08-26T20:17:27Z';

/** 0.2 ETH a US$ 4608.2208671202. Shape real: a Alchemy não manda metadata no nativo. */
export const ETH_NATIVE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: null,
  tokenBalance: '0x00000000000000000000000000000000000000000000000002c68af0bb140000',
  tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
  tokenPrices: [{ currency: 'usd', value: '4608.2208671202', lastUpdatedAt: PRICED_AT }],
};

/** 100 USDC (6 decimals) a US$ 0.9998, sem logo */
export const USDC: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenBalance: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
  tokenMetadata: { decimals: 6, logo: null, name: 'USD Coin', symbol: 'USDC' },
  tokenPrices: [{ currency: 'usd', value: '0.9998', lastUpdatedAt: PRICED_AT }],
};

export const SPAM_NO_PRICE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x1111111111111111111111111111111111111111',
  tokenBalance: '0x3635c9adc5dea00000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Claim Free Airdrop', symbol: 'FREE-CLAIM' },
  tokenPrices: [],
};

export const PRICE_WITH_ERROR: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x2222222222222222222222222222222222222222',
  tokenBalance: '0x0de0b6b3a7640000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Broken Token', symbol: 'BRKN' },
  tokenPrices: [{ currency: 'usd', value: '1.00', lastUpdatedAt: PRICED_AT }],
  error: 'Token metadata unavailable',
};

/** 1 wei a US$ 1 → poeira */
export const DUST: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x3333333333333333333333333333333333333333',
  tokenBalance: '0x1',
  tokenMetadata: { decimals: 18, logo: null, name: 'Dust Token', symbol: 'DUST' },
  tokenPrices: [{ currency: 'usd', value: '1.00', lastUpdatedAt: PRICED_AT }],
};

export const ZERO_BALANCE: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x4444444444444444444444444444444444444444',
  tokenBalance: '0x0',
  tokenMetadata: { decimals: 18, logo: null, name: 'Empty Token', symbol: 'EMPTY' },
  tokenPrices: [{ currency: 'usd', value: '25.00', lastUpdatedAt: PRICED_AT }],
};

/** ERC-20 com metadata nulo: diferente do nativo, é descartado. */
export const NO_METADATA: AlchemyToken = {
  address: WALLET,
  network: 'eth-mainnet',
  tokenAddress: '0x5555555555555555555555555555555555555555',
  tokenBalance: '0x0de0b6b3a7640000',
  tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
  tokenPrices: [{ currency: 'usd', value: '3.00', lastUpdatedAt: PRICED_AT }],
};

export function alchemyPage(tokens: AlchemyToken[], pageKey?: string): AlchemyTokensPage {
  return { data: { tokens, pageKey: pageKey ?? null } };
}

/** Shape real do Prices By Symbol, inclusive o símbolo sem preço. */
export const PRICES_BY_SYMBOL: AlchemyPricesBySymbol = {
  data: [
    {
      symbol: 'ETH',
      prices: [{ currency: 'usd', value: '2322.04', lastUpdatedAt: '2026-10-26T17:03:08.960Z' }],
    },
    {
      symbol: 'MON',
      prices: [{ currency: 'usd', value: '0.021938', lastUpdatedAt: '2026-10-26T17:03:08.672Z' }],
    },
    { symbol: 'NOPE', prices: [], error: { message: 'Price not found for symbol: NOPE' } },
  ],
};

export const RH_TSLA_CONTRACT = '0x322f0929c4625ed5bad873c95208d54e1c003b2d';
export const RH_FAKE_USDG_CONTRACT = '0x0002e1f78217d5430948c5be3dac1ba2bab88a91';

/** 1 TSLA na Robinhood Chain: lá a Portfolio API manda todo ERC-20 sem preço, até os legítimos. */
export const RH_TSLA: AlchemyToken = {
  address: WALLET,
  network: 'robinhood-mainnet',
  tokenAddress: RH_TSLA_CONTRACT,
  tokenBalance: '0x0de0b6b3a7640000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Tesla • Robinhood Token', symbol: 'TSLA' },
  tokenPrices: [],
};

/** "USDG" falso de airdrop na Robinhood Chain: nem a Prices API tem preço para ele. */
export const RH_FAKE_USDG: AlchemyToken = {
  address: WALLET,
  network: 'robinhood-mainnet',
  tokenAddress: RH_FAKE_USDG_CONTRACT,
  tokenBalance: '0x3635c9adc5dea00000',
  tokenMetadata: { decimals: 18, logo: null, name: 'Global Dollar', symbol: 'USDG' },
  tokenPrices: [],
};

/** Shape real do Prices By Address, inclusive o contrato sem preço. */
export const PRICES_BY_ADDRESS: AlchemyPricesByAddress = {
  data: [
    {
      network: 'robinhood-mainnet',
      address: RH_TSLA_CONTRACT,
      prices: [
        { currency: 'usd', value: '405.83440413306727', lastUpdatedAt: '2026-10-27T15:51:54Z' },
      ],
    },
    {
      network: 'robinhood-mainnet',
      address: RH_FAKE_USDG_CONTRACT,
      prices: [],
      error: { message: `Price not found for robinhood-mainnet:${RH_FAKE_USDG_CONTRACT}` },
    },
  ],
};
