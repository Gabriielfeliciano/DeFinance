/** Formato das respostas da API GraphQL da Aave (`https://api.v3.aave.com/graphql`), só os campos que usamos. Valores numéricos vêm como string decimal. */

export interface AaveReserve {
  underlyingToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    imageUrl?: string | null;
  };
  aToken: { address: string };
  vToken: { address: string };
}

export interface AaveMarket {
  /** Ex.: `AaveV3Ethereum`, `AaveV3EthereumLido`. */
  name: string;
  /** Em checksum; o mesmo endereço pode existir em redes distintas. */
  address: string;
  chain: { chainId: number; name: string };
  reserves: readonly AaveReserve[];
}

export interface AaveUserSupply {
  market: { name: string; chain: { chainId: number } };
  currency: { symbol: string; address: string };
  balance: { amount: { value: string }; usd: string };
  isCollateral: boolean;
}

export interface AaveUserBorrow {
  market: { name: string; chain: { chainId: number } };
  currency: { symbol: string; address: string };
  debt: { amount: { value: string }; usd: string };
}

/** `markets(request: { chainIds, user }) { userState { healthFactor } }`. */
export interface AaveMarketHealth {
  name?: string;
  address: string;
  chain: { chainId: number };
  /** `healthFactor` é `null` sem empréstimo; `userState` é `null` sem `user`. */
  userState: {
    healthFactor: string | null;
    netWorth?: string;
    totalDebtBase?: string;
    totalCollateralBase?: string;
  } | null;
}
