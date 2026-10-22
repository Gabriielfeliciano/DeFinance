/// <reference types="node" />

import { createCoinGeckoLogos } from '../server/coingecko-logos';
import { handleTokensRequest } from '../server/tokens-handler';

/** Fora do handler: instâncias quentes da função reaproveitam as listas em cache. */
const logos = createCoinGeckoLogos();

export function GET(request: Request): Promise<Response> {
  return handleTokensRequest(request, { apiKey: process.env['ALCHEMY_API_KEY'], logos });
}
