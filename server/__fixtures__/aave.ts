import type { AaveMarket, AaveMarketHealth, AaveUserBorrow, AaveUserSupply } from '../aave-types';

/**
 * Respostas reais da API GraphQL da Aave (`https://api.v3.aave.com/graphql`,
 * 2026-10-29), cortadas. Tipados com `aave-types.ts`.
 */
export const AAVE_USER = '0x970a959ff873efe333f0153b1cdcac853f41c425';

/** `markets(request: { chainIds: [1, 8453] }) { ... reserves { ... } }`, com 3 reservas por mercado (a real tem 67 na Ethereum). Endereços em checksum. */
export const AAVE_MARKETS: AaveMarket[] = [
  {
    name: 'AaveV3Ethereum',
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    chain: { chainId: 1, name: 'Ethereum' },
    reserves: [
      {
        underlyingToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          imageUrl:
            'https://token-logos.family.co/asset?id=1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&token=USDC',
        },
        aToken: { address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c' },
        vToken: { address: '0x72E95b8931767C79bA4EeE721354d6E99a61D004' },
      },
      {
        underlyingToken: {
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          symbol: 'WBTC',
          name: 'Wrapped BTC',
          decimals: 8,
          imageUrl:
            'https://token-logos.family.co/asset?id=1:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&token=WBTC',
        },
        aToken: { address: '0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8' },
        vToken: { address: '0x40aAbEf1aa8f0eEc637E0E7d92fbfFB2F26A8b7B' },
      },
      {
        underlyingToken: {
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
          imageUrl:
            'https://token-logos.family.co/asset?id=1:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&token=WETH',
        },
        aToken: { address: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8' },
        vToken: { address: '0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE' },
      },
    ],
  },
  {
    name: 'AaveV3Base',
    address: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    chain: { chainId: 8453, name: 'Base' },
    reserves: [
      {
        underlyingToken: {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          imageUrl:
            'https://token-logos.family.co/asset?id=8453:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&token=USDC',
        },
        aToken: { address: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' },
        vToken: { address: '0x59dca05b6c26dbd64b5381374aAaC5CD05644C28' },
      },
      {
        underlyingToken: {
          address: '0x4200000000000000000000000000000000000006',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
          imageUrl:
            'https://token-logos.family.co/asset?id=8453:0x4200000000000000000000000000000000000006&token=WETH',
        },
        aToken: { address: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7' },
        vToken: { address: '0x24e6e0795b3c7c71D965fCc4f371803d1c1DcA1E' },
      },
      {
        underlyingToken: {
          address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
          symbol: 'cbBTC',
          name: 'Coinbase Wrapped BTC',
          decimals: 8,
          imageUrl:
            'https://token-logos.family.co/asset?id=8453:0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf&token=cbBTC',
        },
        aToken: { address: '0xBdb9300b7CDE636d9cD4AFF00f6F009fFBBc8EE6' },
        vToken: { address: '0x05e08702028de6AaD395DC6478b554a56920b9AD' },
      },
    ],
  },
];

/** `userSupplies` dos quatro mercados da Ethereum: 3,03841532 WBTC como colateral, a US$ 245.063,95. */
export const AAVE_SUPPLIES: AaveUserSupply[] = [
  {
    market: { name: 'AaveV3Ethereum', chain: { chainId: 1 } },
    currency: { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    balance: { amount: { value: '3.03841532' }, usd: '245063.9511508335303352' },
    isCollateral: true,
  },
];

/** `userBorrows` dos mesmos mercados: 150.660,21637 USDC de dívida, a US$ 150.631,83. */
export const AAVE_BORROWS: AaveUserBorrow[] = [
  {
    market: { name: 'AaveV3Ethereum', chain: { chainId: 1 } },
    currency: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    debt: { amount: { value: '150660.21637' }, usd: '150631.8274654294009' },
  },
];

/**
 * Health factor realmente usado: `markets(request: { chainIds, user }) { userState { ... } }`,
 * uma chamada para todos os mercados. Sem empréstimo, `healthFactor` é `null`
 * e os totais vêm "0" (os três mercados vazios da Ethereum estão cortados).
 */
export const AAVE_HEALTH: AaveMarketHealth[] = [
  {
    name: 'AaveV3Ethereum',
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    chain: { chainId: 1 },
    userState: {
      healthFactor: '1.3829148720979634627735725273',
      netWorth: '94436.9221984306267952',
      totalDebtBase: '150627.02895240290354',
      totalCollateralBase: '245063.9511508335303352',
    },
  },
  {
    name: 'AaveV3Base',
    address: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    chain: { chainId: 8453 },
    userState: { healthFactor: null, netWorth: '0', totalDebtBase: '0', totalCollateralBase: '0' },
  },
];
