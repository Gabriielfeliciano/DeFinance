import { handleTokensRequest } from '../server/tokens-handler';

export function GET(request: Request): Promise<Response> {
  return handleTokensRequest(request, { apiKey: process.env['ALCHEMY_API_KEY'] });
}
