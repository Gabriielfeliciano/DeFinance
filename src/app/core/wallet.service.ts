import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import type { TokenItem, TokensResponse } from '../../../shared/token';

export type WalletStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export const REQUEST_TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private lastAddress: string | null = null;

  private readonly _status = signal<WalletStatus>('idle');
  private readonly _tokens = signal<TokenItem[]>([]);
  private readonly _totalValueUsd = signal(0);

  readonly status = this._status.asReadonly();
  readonly tokens = this._tokens.asReadonly();
  readonly totalValueUsd = this._totalValueUsd.asReadonly();

  load(address: string): void {
    this.lastAddress = address;
    this.request?.unsubscribe();
    this.setData([], 0);
    this._status.set('loading');

    this.request = this.http
      .get<TokensResponse>('/api/tokens', { params: { address } })
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          this.setData(response.tokens, response.totalValueUsd);
          this._status.set(response.tokens.length > 0 ? 'success' : 'empty');
        },
        error: () => {
          this.setData([], 0);
          this._status.set('error');
        },
      });
  }

  retry(): void {
    if (this.lastAddress) this.load(this.lastAddress);
  }

  private setData(tokens: TokenItem[], totalValueUsd: number): void {
    this._tokens.set(tokens);
    this._totalValueUsd.set(totalValueUsd);
  }
}
