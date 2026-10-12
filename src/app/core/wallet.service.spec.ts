import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TokenItem, TokensResponse } from '../../../shared/token';
import { REQUEST_TIMEOUT_MS, WalletService } from './wallet.service';

const ADDRESS_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ADDRESS_B = '0x1111111111111111111111111111111111111111';

const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};

describe('WalletService', () => {
  let service: WalletService;
  let http: HttpTestingController;

  const expectTokensRequest = (address: string) =>
    http.expectOne((req) => req.url === '/api/tokens' && req.params.get('address') === address);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WalletService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('starts idle and empty', () => {
    expect(service.status()).toBe('idle');
    expect(service.tokens()).toEqual([]);
    expect(service.totalValueUsd()).toBe(0);
  });

  it('goes to loading and requests the proxy with the address', () => {
    service.load(ADDRESS_A);
    expect(service.status()).toBe('loading');
    expectTokensRequest(ADDRESS_A);
  });

  it('exposes tokens and total on success', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
    expect(service.tokens()).toEqual([ETH]);
    expect(service.totalValueUsd()).toBe(920);
  });

  it('reports empty when the wallet has no priced tokens', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ tokens: [], totalValueUsd: 0 } satisfies TokensResponse);
    expect(service.status()).toBe('empty');
  });

  it('reports error and clears data when the proxy fails', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ error: 'Falha' }, { status: 502, statusText: 'Bad Gateway' });
    expect(service.status()).toBe('error');
    expect(service.tokens()).toEqual([]);
    expect(service.totalValueUsd()).toBe(0);
  });

  it('retries the last address', () => {
    service.load(ADDRESS_A);
    expectTokensRequest(ADDRESS_A).flush({ error: 'Falha' }, { status: 502, statusText: 'Bad Gateway' });
    service.retry();
    expect(service.status()).toBe('loading');
    expectTokensRequest(ADDRESS_A).flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
  });

  it('does nothing on retry before any load', () => {
    service.retry();
    expect(service.status()).toBe('idle');
  });

  it('cancels the previous request when a new address is submitted', () => {
    service.load(ADDRESS_A);
    const first = expectTokensRequest(ADDRESS_A);
    service.load(ADDRESS_B);
    const second = expectTokensRequest(ADDRESS_B);

    expect(first.cancelled).toBe(true);
    second.flush({ tokens: [ETH], totalValueUsd: 920 } satisfies TokensResponse);
    expect(service.status()).toBe('success');
    expect(service.tokens()).toEqual([ETH]);
  });

  it('fails with error when the proxy does not answer in time', () => {
    vi.useFakeTimers();
    service.load(ADDRESS_A);
    const req = expectTokensRequest(ADDRESS_A);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    expect(service.status()).toBe('error');
    expect(req.cancelled).toBe(true);
  });
});
