import type { LendingAsset, LendingMarket } from '../../../shared/lending';
import type { ChainId, TokenItem, TokensResponse } from '../../../shared/token';

const LOGO = 'https://assets.coingecko.com/coins/images';

function token(
  chain: ChainId,
  contract: string,
  symbol: string,
  name: string,
  balance: number,
  priceUsd: number,
  logoUrl?: string,
): TokenItem {
  return { id: `${chain}:${contract}`, chain, symbol, name, logoUrl, balance, priceUsd, valueUsd: balance * priceUsd };
}

const tokens: TokenItem[] = [
  token('ethereum', 'native', 'ETH', 'Ethereum', 2.4512, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USDC', 'USD Coin', 4250, 0.9998, `${LOGO}/6319/small/usdc.png`),
  token('ethereum', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'WBTC', 'Wrapped Bitcoin', 0.0852, 67120, `${LOGO}/7598/small/wrapped_bitcoin_wbtc.png`),
  token('ethereum', '0x514910771af9ca656af840dff83e8264ecf986ca', 'LINK', 'Chainlink', 310.5, 14.82, `${LOGO}/877/small/chainlink-new-logo.png`),
  token('ethereum', '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'UNI', 'Uniswap', 120, 9.75, `${LOGO}/12504/small/uni.jpg`),
  token('ethereum', '0x6982508145454ce325ddbe47a25d4ec3d2311933', 'PEPE', 'Pepe', 18_500_000, 0.00001234, `${LOGO}/29850/small/pepe-token.jpeg`),
  token('arbitrum', 'native', 'ETH', 'Ethereum', 0.62, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('arbitrum', '0x912ce59144191c1204e64559fe8253a0e49e6548', 'ARB', 'Arbitrum', 1850, 0.82, `${LOGO}/16547/small/arb.jpg`),
  token('arbitrum', '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 'USDC', 'USD Coin', 760, 0.9998, `${LOGO}/6319/small/usdc.png`),
  token('base', 'native', 'ETH', 'Ethereum', 0.35, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('base', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'USDC', 'USD Coin', 1200, 0.9998, `${LOGO}/6319/small/usdc.png`),
  token('base', '0x940181a94a35a4569e4529a3cdfb74e38fd98631', 'AERO', 'Aerodrome', 400, 1.12, `${LOGO}/31745/small/token.png`),
  token('optimism', 'native', 'ETH', 'Ether', 0.18, 3512.4, '/tokens/eth.svg'),
  token('optimism', '0x4200000000000000000000000000000000000042', 'OP', 'Optimism', 640, 1.74, `${LOGO}/25244/small/Optimism.png`),
  token('polygon', 'native', 'POL', 'Polygon Ecosystem Token', 2100, 0.23, `${LOGO}/32440/small/pol.png`),
  token('bnb', 'native', 'BNB', 'BNB', 0.9, 598.3, `${LOGO}/825/small/bnb-icon2_2x.png`),
  token('avalanche', 'native', 'AVAX', 'Avalanche', 14, 27.6, `${LOGO}/12559/small/Avalanche_Circle_RedWhite_Trans.png`),
  token('hyperevm', 'native', 'HYPE', 'Hyperliquid', 22, 31.5, `${LOGO}/50882/small/hyperliquid.jpg`),
  // Sem logo de propósito: mostra o fallback de iniciais.
  token('base', '0x4ed4e862860bed51a9570b96d89af5e1b0efefed', 'DEGEN', 'Degen', 52_000, 0.0081),
];

/** Carteira de exemplo usada só em `npm run start:mock`. */
export const MOCK_PORTFOLIO: TokensResponse = {
  tokens,
  totalValueUsd: tokens.reduce((total, item) => total + item.valueUsd, 0),
  failedChains: [],
};

const secondTokens: TokenItem[] = [
  token('ethereum', 'native', 'ETH', 'Ethereum', 0.8, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USDC', 'USD Coin', 1500, 0.9998, `${LOGO}/6319/small/usdc.png`),
  token('base', 'native', 'ETH', 'Ethereum', 0.1, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('optimism', '0x4200000000000000000000000000000000000042', 'OP', 'Optimism', 300, 1.74, `${LOGO}/25244/small/Optimism.png`),
];

/** Segunda carteira do modo mock: tem tokens em comum com `MOCK_PORTFOLIO` para mostrar a soma. */
export const MOCK_SECOND_PORTFOLIO: TokensResponse = {
  tokens: secondTokens,
  totalValueUsd: secondTokens.reduce((total, item) => total + item.valueUsd, 0),
  failedChains: [],
};

const solanaTokens: TokenItem[] = [
  token('solana', 'native', 'SOL', 'Solana', 12.4, 168.2, `${LOGO}/4128/small/solana.png`),
  token('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USDC', 'USD Coin', 850, 0.9998, `${LOGO}/6319/small/usdc.png`),
  token('solana', 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', 'JUP', 'Jupiter', 1400, 0.74, `${LOGO}/34188/small/jup.png`),
  token('solana', 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'BONK', 'Bonk', 25_000_000, 0.0000214, `${LOGO}/28600/small/bonk.jpg`),
];

/** Carteira Solana do modo mock: o USDC soma com o das carteiras EVM no gráfico. */
export const MOCK_SOLANA_PORTFOLIO: TokensResponse = {
  tokens: solanaTokens,
  totalValueUsd: solanaTokens.reduce((total, item) => total + item.valueUsd, 0),
  failedChains: [],
};

function asset(underlying: string, symbol: string, name: string, balance: number, priceUsd: number, logoUrl?: string): LendingAsset {
  return { underlying, symbol, name, logoUrl, balance, valueUsd: balance * priceUsd };
}

const WBTC = asset('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'WBTC', 'Wrapped Bitcoin', 3.6, 67120, `${LOGO}/7598/small/wrapped_bitcoin_wbtc.png`);
const USDC_ETH = asset('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USDC', 'USD Coin', 140_000, 0.9998, `${LOGO}/6319/small/usdc.png`);
const WETH_BASE = asset('0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 12, 3512.4, `${LOGO}/2518/small/weth.png`);
const USDC_BASE = asset('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'USDC', 'USD Coin', 18_000, 0.9998, `${LOGO}/6319/small/usdc.png`);

const aaveEthereum: LendingMarket = {
  id: 'ethereum:0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
  chain: 'ethereum',
  label: 'Aave · Ethereum',
  supplied: [WBTC],
  borrowed: [USDC_ETH],
  healthFactor: 1.38,
};

const aaveBase: LendingMarket = {
  id: 'base:0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
  chain: 'base',
  label: 'Aave · Base',
  supplied: [WETH_BASE],
  borrowed: [USDC_BASE],
  healthFactor: 2.3,
};

const aaveWalletTokens: TokenItem[] = [
  token('ethereum', 'native', 'ETH', 'Ethereum', 0.42, 3512.4, `${LOGO}/279/small/ethereum.png`),
  token('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USDC', 'USD Coin', 900, 0.9998, `${LOGO}/6319/small/usdc.png`),
];

/** Carteira com posições na Aave (Ethereum e Base) em `npm run start:mock`. */
export const MOCK_AAVE_PORTFOLIO: TokensResponse = {
  tokens: aaveWalletTokens,
  totalValueUsd: aaveWalletTokens.reduce((total, item) => total + item.valueUsd, 0),
  failedChains: [],
  lending: [aaveEthereum, aaveBase],
  lendingFailed: false,
};

/** Carteira com health factor perigoso (1,05). */
export const MOCK_AAVE_DANGER_PORTFOLIO: TokensResponse = {
  tokens: aaveWalletTokens,
  totalValueUsd: MOCK_AAVE_PORTFOLIO.totalValueUsd,
  failedChains: [],
  lending: [{ ...aaveEthereum, healthFactor: 1.05 }],
  lendingFailed: false,
};

const aaveDownTokens: TokenItem[] = [
  ...aaveWalletTokens,
  token('ethereum', '0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8', 'aEthWBTC', 'Aave Ethereum WBTC', 3.6, 67120),
];

/** A consulta à Aave falhou: o aToken continua na lista de tokens e o aviso aparece. */
export const MOCK_AAVE_DOWN_PORTFOLIO: TokensResponse = {
  tokens: aaveDownTokens,
  totalValueUsd: aaveDownTokens.reduce((total, item) => total + item.valueUsd, 0),
  failedChains: [],
  lending: [],
  lendingFailed: true,
};
