import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { addressKey } from '../../../shared/address';
import { CHAINS, type ChainId, type TokensResponse } from '../../../shared/token';
import type { LendingMarket } from '../../../shared/lending';
import { mergeTokens, portfolioStatus, walletNetUsd, type WalletState } from './portfolio';

export type { PortfolioStatus as WalletStatus } from './portfolio';

export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_WALLETS = 3;

/** Mercado com a carteira dona da posição. */
export type WalletLending = LendingMarket & { wallet: string };

export type AddResult = 'added' | 'duplicate' | 'full';

const key = addressKey;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  /** Uma requisição por carteira, pela chave (`addressKey`). */
  private readonly requests = new Map<string, Subscription>();

  private readonly _wallets = signal<WalletState[]>([]);

  /** Na ordem em que foram adicionadas. */
  readonly wallets = this._wallets.asReadonly();

  private readonly enabled = computed(() => this._wallets().filter((wallet) => wallet.enabled));
  private readonly loaded = computed(() => this.enabled().filter((wallet) => wallet.status === 'success'));
  /** Ligadas que responderam, com ou sem tokens. */
  private readonly settled = computed(() =>
    this.enabled().filter((wallet) => wallet.status === 'success' || wallet.status === 'empty'),
  );

  readonly status = computed(() => portfolioStatus(this.enabled(), this._wallets().length));
  readonly tokens = computed(() => mergeTokens(this.loaded().map((wallet) => wallet.tokens)));
  /** Valor líquido: tokens + depositado - emprestado. */
  readonly totalValueUsd = computed(() => this.loaded().reduce((sum, wallet) => sum + walletNetUsd(wallet), 0));
  /** Posições na Aave das carteiras ligadas que carregaram. */
  readonly lending = computed<WalletLending[]>(() =>
    this.loaded().flatMap((wallet) => wallet.lending.map((market) => ({ ...market, wallet: wallet.address }))),
  );
  /** Carteiras ligadas que responderam, com ou sem tokens, em que a Aave falhou: o líquido vem sem ela. */
  readonly lendingFailedWallets = computed(() => this.settled().filter((wallet) => wallet.lendingFailed));
  /** Redes que o proxy não conseguiu consultar em alguma carteira ligada. */
  readonly failedChains = computed(() => {
    // Inclui as vazias: as redes que falharam podem ser justamente onde estão os tokens.
    const failed = new Set(this.settled().flatMap((wallet) => wallet.failedChains));
    return CHAINS.filter((chain) => failed.has(chain));
  });
  /** Carteiras ligadas que falharam por inteiro: o total vem sem elas. */
  readonly failedWallets = computed(() => this.enabled().filter((wallet) => wallet.status === 'error'));
  /** Carteiras ligadas que entraram na soma (com ou sem tokens). */
  readonly loadedCount = computed(() => this.settled().length);

  add(address: string): AddResult {
    const wallets = this._wallets();
    if (wallets.some((wallet) => key(wallet.address) === key(address))) return 'duplicate';
    if (wallets.length >= MAX_WALLETS) return 'full';

    this._wallets.set([...wallets, this.loadingState(address, true)]);
    this.fetch(address);
    return 'added';
  }

  remove(address: string): void {
    this.requests.get(key(address))?.unsubscribe();
    this.requests.delete(key(address));

    const remaining = this._wallets().filter((wallet) => key(wallet.address) !== key(address));
    // Nunca fica "carteiras adicionadas, nenhuma ligada".
    if (remaining.length > 0 && !remaining.some((wallet) => wallet.enabled)) {
      remaining[0] = { ...remaining[0], enabled: true };
    }
    this._wallets.set(remaining);
  }

  /** A última carteira ligada não desliga. */
  toggle(address: string): void {
    const target = this.find(address);
    if (!target || (target.enabled && this.enabled().length === 1)) return;
    this.patch(address, { enabled: !target.enabled });
  }

  retry(address: string): void {
    if (this.find(address)) this.fetch(address);
  }

  /** Refaz as carteiras ligadas com erro ou com redes que falharam. */
  retryFailed(): void {
    for (const wallet of this.enabled()) {
      if (wallet.status === 'error' || wallet.failedChains.length > 0 || wallet.lendingFailed) this.fetch(wallet.address);
    }
  }

  private fetch(address: string): void {
    this.requests.get(key(address))?.unsubscribe();
    const enabled = this.find(address)?.enabled ?? true;
    this.patch(address, this.loadingState(address, enabled));

    const request = this.http
      .get<TokensResponse>('/api/tokens', { params: { address } })
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        // `failedChains` ausente = resposta antiga, ainda no cache da CDN: trata como completa.
        // `lending`/`lendingFailed` ausentes = sem Aave (resposta antiga ou Solana).
        next: (response) =>
          this.patch(address, {
            status: response.tokens.length > 0 || (response.lending?.length ?? 0) > 0 ? 'success' : 'empty',
            tokens: response.tokens,
            totalValueUsd: response.totalValueUsd,
            failedChains: response.failedChains ?? [],
            lending: response.lending ?? [],
            lendingFailed: response.lendingFailed ?? false,
          }),
        error: () => this.patch(address, { status: 'error' }),
      });
    this.requests.set(key(address), request);
  }

  private loadingState(address: string, enabled: boolean): WalletState {
    return { address, enabled, status: 'loading', tokens: [], totalValueUsd: 0, failedChains: [], lending: [], lendingFailed: false };
  }

  private find(address: string): WalletState | undefined {
    return this._wallets().find((wallet) => key(wallet.address) === key(address));
  }

  /** Atualiza só a carteira `address`; se ela foi removida, não faz nada. */
  private patch(address: string, changes: Partial<WalletState>): void {
    this._wallets.update((wallets) =>
      wallets.map((wallet) => (key(wallet.address) === key(address) ? { ...wallet, ...changes } : wallet)),
    );
  }
}
