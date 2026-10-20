export interface AlchemyTokenPrice {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}

export interface AlchemyTokenMetadata {
  decimals: number | null;
  logo: string | null;
  name: string | null;
  symbol: string | null;
}

export interface AlchemyToken {
  address: string;
  network: string;
  /** `null` para o token nativo da rede. */
  tokenAddress: string | null;
  /** Inteiro em string (hex `0x…` nos exemplos da Alchemy). */
  tokenBalance: string;
  /** No token nativo a Alchemy devolve todos os campos `null`. */
  tokenMetadata?: AlchemyTokenMetadata | null;
  tokenPrices?: AlchemyTokenPrice[] | null;
  /** Ausente nos tokens sem erro. */
  error?: string | null;
}

export interface AlchemyTokensPage {
  data?: { tokens: AlchemyToken[]; pageKey?: string | null };
  /** Presente só em falha parcial (HTTP 200). */
  error?: { message: string; partialErrors?: { network: string; message: string }[] };
}
