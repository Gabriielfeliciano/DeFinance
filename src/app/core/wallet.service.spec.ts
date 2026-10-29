import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ChainId, TokenItem, TokensResponse } from '../../../shared/token';
import { MAX_WALLETS, REQUEST_TIMEOUT_MS, WalletService } from './wallet.service';

const ADDRESS_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ADDRESS_B = '0x1111111111111111111111111111111111111111';
const ADDRESS_C = '0x2222222222222222222222222222222222222222';
const SOLANA = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
const SOLANA_OTHER_CASE = '86XCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
const ADDRESS_D = '0x3333333333333333333333333333333333333333';

const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};

function response(tokens: TokenItem[], failedChains: ChainId[] = []): TokensResponse {
  return { tokens, totalValueUsd: tokens.reduce((sum, token) => sum + token.valueUsd, 0), failedChains };
}

describe('WalletService', () => {
  let service: WalletService;
  let http: HttpTestingController;

  const expectTokensRequest = (address: string) =>
    http.expectOne((req) => req.url === '/api/tokens' && req.params.get('address') === address);
  const succeed = (address: string, tokens: TokenItem[] = [ETH], failedChains: ChainId[] = []) =>
    expectTokensRequest(address).flush(response(tokens, failedChains));
  const fail = (address: string) =>
    expectTokensRequest(address).flush({ error: 'Falha' }, { status: 502, statusText: 'Bad Gateway' });
  const wallet = (address: string) => service.wallets().find((item) => item.address === address)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WalletService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('starts with no wallets and idle status', () => {
    expect(service.wallets()).toEqual([]);
    expect(service.status()).toBe('idle');
    expect(service.tokens()).toEqual([]);
    expect(service.totalValueUsd()).toBe(0);
  });

  it('add requests the proxy and marks the wallet loading', () => {
    expect(service.add(ADDRESS_A)).toBe('added');
    expect(service.wallets()[0]).toMatchObject({ address: ADDRESS_A, enabled: true, status: 'loading' });
    expect(service.status()).toBe('loading');
    expectTokensRequest(ADDRESS_A);
  });

  it("exposes a wallet's tokens and total on success", () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A);
    expect(wallet(ADDRESS_A)).toMatchObject({ status: 'success', totalValueUsd: 920 });
    expect(service.status()).toBe('success');
    expect(service.tokens()).toEqual([ETH]);
    expect(service.totalValueUsd()).toBe(920);
  });

  it('reports empty when the wallet has no priced tokens', () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A, []);
    expect(wallet(ADDRESS_A).status).toBe('empty');
    expect(service.status()).toBe('empty');
  });

  it('rejects a duplicate address in any case', () => {
    service.add(ADDRESS_A);
    expect(service.add(ADDRESS_A.toLowerCase())).toBe('duplicate');
    expect(service.add('0x' + ADDRESS_A.slice(2).toUpperCase())).toBe('duplicate');
    expect(service.wallets().length).toBe(1);
    expectTokensRequest(ADDRESS_A);
  });

  it(`refuses wallets beyond ${MAX_WALLETS}`, () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    service.add(ADDRESS_C);
    expect(service.add(ADDRESS_D)).toBe('full');
    expect(service.wallets().length).toBe(3);
    [ADDRESS_A, ADDRESS_B, ADDRESS_C].forEach((address) => expectTokensRequest(address));
  });

  it('merges only enabled wallets', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    succeed(ADDRESS_A);
    succeed(ADDRESS_B, [{ ...ETH, balance: 0.3, valueUsd: 1380 }]);
    expect(service.tokens()).toEqual([{ ...ETH, balance: 0.5, valueUsd: 2300 }]);
    expect(service.totalValueUsd()).toBe(2300);

    service.toggle(ADDRESS_B);
    expect(wallet(ADDRESS_B).enabled).toBe(false);
    expect(service.tokens()).toEqual([ETH]);
    expect(service.totalValueUsd()).toBe(920);
  });

  it('does not disable the last enabled wallet', () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A);
    service.toggle(ADDRESS_A);
    expect(wallet(ADDRESS_A).enabled).toBe(true);
  });

  it('removing the last enabled wallet enables the first remaining one', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    service.add(ADDRESS_C);
    [ADDRESS_A, ADDRESS_B, ADDRESS_C].forEach((address) => succeed(address));
    service.toggle(ADDRESS_A);
    service.toggle(ADDRESS_B);
    service.remove(ADDRESS_C);
    expect(service.wallets().map((item) => [item.address, item.enabled])).toEqual([
      [ADDRESS_A, true],
      [ADDRESS_B, false],
    ]);
  });

  it('removing every wallet goes back to idle', () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A);
    service.remove(ADDRESS_A);
    expect(service.status()).toBe('idle');
    expect(service.tokens()).toEqual([]);
  });

  it('adds an EVM and a Solana wallet together and merges tokens and totals', () => {
    const SOL: TokenItem = {
      id: 'solana:native', chain: 'solana', symbol: 'SOL', name: 'Solana', balance: 2, priceUsd: 100, valueUsd: 200,
    };
    expect(service.add(ADDRESS_A)).toBe('added');
    expect(service.add(SOLANA)).toBe('added');
    succeed(ADDRESS_A);
    succeed(SOLANA, [SOL]);
    expect(service.tokens().map((token) => token.id).sort()).toEqual(['ethereum:native', 'solana:native']);
    expect(service.totalValueUsd()).toBe(1120);
  });

  it('removes a Solana wallet by its exact case', () => {
    service.add(SOLANA);
    service.add(SOLANA_OTHER_CASE);
    succeed(SOLANA);
    succeed(SOLANA_OTHER_CASE);
    service.remove(SOLANA_OTHER_CASE);
    expect(service.wallets().map((item) => item.address)).toEqual([SOLANA]);
  });

  it('cancels the request of a removed wallet', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    const req = expectTokensRequest(ADDRESS_A);
    service.remove(ADDRESS_A);
    expect(req.cancelled).toBe(true);
    expect(service.wallets().map((item) => item.address)).toEqual([ADDRESS_B]);
    expectTokensRequest(ADDRESS_B);
  });

  it('re-adding a removed address loads it again', () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A);
    service.remove(ADDRESS_A);
    expect(service.add(ADDRESS_A)).toBe('added');
    succeed(ADDRESS_A);
    expect(service.status()).toBe('success');
  });

  it('keeps other wallets when one fails', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    succeed(ADDRESS_A);
    fail(ADDRESS_B);
    expect(service.status()).toBe('success');
    expect(service.totalValueUsd()).toBe(920);
    expect(service.failedWallets().map((item) => item.address)).toEqual([ADDRESS_B]);
    expect(service.loadedCount()).toBe(1);
  });

  it('reports error when every enabled wallet fails', () => {
    service.add(ADDRESS_A);
    fail(ADDRESS_A);
    expect(wallet(ADDRESS_A)).toMatchObject({ status: 'error', tokens: [], totalValueUsd: 0 });
    expect(service.status()).toBe('error');
  });

  it('unions failed chains of enabled wallets in chain order', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    succeed(ADDRESS_A, [ETH], ['scroll']);
    succeed(ADDRESS_B, [ETH], ['scroll', 'linea']);
    expect(service.failedChains()).toEqual(['linea', 'scroll']);
    service.toggle(ADDRESS_B);
    expect(service.failedChains()).toEqual(['scroll']);
  });

  it('keeps the failed chains of a wallet that came back empty', () => {
    service.add(ADDRESS_A);
    succeed(ADDRESS_A, [], ['linea']);
    expect(service.status()).toBe('empty');
    expect(service.failedChains()).toEqual(['linea']);
  });

  it('treats a response cached before failedChains existed as complete', () => {
    service.add(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ tokens: [ETH], totalValueUsd: 920 });
    expect(service.failedChains()).toEqual([]);
  });

  it('retry reloads only that wallet', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    succeed(ADDRESS_A);
    fail(ADDRESS_B);
    service.retry(ADDRESS_B);
    expect(wallet(ADDRESS_B).status).toBe('loading');
    succeed(ADDRESS_B);
    expect(wallet(ADDRESS_B).status).toBe('success');
  });

  it('retryFailed reloads errored and partial enabled wallets', () => {
    service.add(ADDRESS_A);
    service.add(ADDRESS_B);
    service.add(ADDRESS_C);
    succeed(ADDRESS_A);
    succeed(ADDRESS_B, [ETH], ['linea']);
    fail(ADDRESS_C);
    service.retryFailed();
    succeed(ADDRESS_B);
    succeed(ADDRESS_C);
    expect(service.failedChains()).toEqual([]);
    expect(service.failedWallets()).toEqual([]);
  });

  it('fails only that wallet when the proxy does not answer in time', () => {
    vi.useFakeTimers();
    service.add(ADDRESS_A);
    const req = expectTokensRequest(ADDRESS_A);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    expect(wallet(ADDRESS_A).status).toBe('error');
    expect(req.cancelled).toBe(true);
  });
});
