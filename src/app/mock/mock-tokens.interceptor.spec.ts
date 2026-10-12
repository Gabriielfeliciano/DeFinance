import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TokensResponse } from '../../../shared/token';
import { MOCK_PORTFOLIO } from './mock-portfolio';
import {
  MOCK_EMPTY_ADDRESS,
  MOCK_ERROR_ADDRESS,
  MOCK_LATENCY_MS,
  mockTokensInterceptor,
} from './mock-tokens.interceptor';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('mockTokensInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockTokensInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  function getTokens(address: string) {
    const result: { body?: TokensResponse; error?: HttpErrorResponse } = {};
    http.get<TokensResponse>('/api/tokens', { params: { address } }).subscribe({
      next: (body) => (result.body = body),
      error: (error: HttpErrorResponse) => (result.error = error),
    });
    return result;
  }

  it('answers /api/tokens with the sample portfolio after a short latency', () => {
    const result = getTokens(ADDRESS);
    expect(result.body).toBeUndefined();
    vi.advanceTimersByTime(MOCK_LATENCY_MS);
    expect(result.body).toEqual(MOCK_PORTFOLIO);
  });

  it('answers an empty wallet for the zero address', () => {
    const result = getTokens(MOCK_EMPTY_ADDRESS);
    vi.advanceTimersByTime(MOCK_LATENCY_MS);
    expect(result.body).toEqual({ tokens: [], totalValueUsd: 0 });
  });

  it('fails with 502 for the error demo address, in any letter case', () => {
    const result = getTokens(MOCK_ERROR_ADDRESS.toUpperCase().replace('0X', '0x'));
    vi.advanceTimersByTime(MOCK_LATENCY_MS);
    expect(result.error?.status).toBe(502);
  });

  it('lets every other request through to the real backend', () => {
    http.get('/other').subscribe();
    backend.expectOne('/other').flush({});
  });
});

describe('MOCK_PORTFOLIO', () => {
  it('has a total equal to the sum of token values', () => {
    const sum = MOCK_PORTFOLIO.tokens.reduce((total, token) => total + token.valueUsd, 0);
    expect(MOCK_PORTFOLIO.totalValueUsd).toBeCloseTo(sum, 6);
  });

  it('covers all three chains and enough assets to group "Outros" in the chart', () => {
    expect(new Set(MOCK_PORTFOLIO.tokens.map((token) => token.chain))).toEqual(
      new Set(['ethereum', 'arbitrum', 'base']),
    );
    expect(new Set(MOCK_PORTFOLIO.tokens.map((token) => token.symbol)).size).toBeGreaterThan(7);
  });
});
