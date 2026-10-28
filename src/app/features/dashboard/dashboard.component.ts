import { Component, computed, inject, linkedSignal } from '@angular/core';
import { CHAIN_LABELS, CHAINS, type ChainId } from '../../../../shared/token';
import { shortAddress } from '../../core/format';
import { MAX_WALLETS, WalletService } from '../../core/wallet.service';
import { ChainFilterComponent, type ChainSelection } from '../chain-filter/chain-filter.component';
import { PortfolioChartComponent } from '../portfolio-chart/portfolio-chart.component';
import { PortfolioSummaryComponent } from '../portfolio-summary/portfolio-summary.component';
import { TokenListComponent } from '../token-list/token-list.component';
import { WalletCardsComponent } from '../wallet-cards/wallet-cards.component';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

const LIST_FORMAT = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

@Component({
  selector: 'app-dashboard',
  imports: [
    WalletInputComponent,
    WalletCardsComponent,
    ChainFilterComponent,
    PortfolioSummaryComponent,
    PortfolioChartComponent,
    TokenListComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly wallet = inject(WalletService);
  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected readonly chainCount = CHAINS.length;
  protected readonly maxWallets = MAX_WALLETS;

  protected readonly addresses = computed(() => this.wallet.wallets().map((wallet) => wallet.address));

  protected readonly chainCounts = computed(() => {
    const counts: Partial<Record<ChainId, number>> = {};
    for (const token of this.wallet.tokens()) counts[token.chain] = (counts[token.chain] ?? 0) + 1;
    return counts;
  });

  /** Volta para "Todas" quando a rede escolhida fica sem tokens (ex.: carteira desligada). */
  protected readonly selectedChain = linkedSignal<Partial<Record<ChainId, number>>, ChainSelection>({
    source: this.chainCounts,
    computation: (counts, previous) =>
      previous && previous.value !== 'all' && counts[previous.value] ? previous.value : 'all',
  });

  /** `0x1a2B…9f3c e 0x77eF…01aa`: carteiras ligadas que não carregaram. */
  protected readonly failedWalletNames = computed(() =>
    LIST_FORMAT.format(this.wallet.failedWallets().map((wallet) => shortAddress(wallet.address))),
  );

  /** `Linea e Scroll`: redes que o proxy não conseguiu consultar. */
  protected readonly failedChainNames = computed(() =>
    LIST_FORMAT.format(this.wallet.failedChains().map((chain) => CHAIN_LABELS[chain])),
  );

  protected readonly visibleTokens = computed(() => {
    const chain = this.selectedChain();
    const tokens = this.wallet.tokens();
    return chain === 'all' ? tokens : tokens.filter((token) => token.chain === chain);
  });

  protected readonly visibleTotal = computed(() =>
    this.selectedChain() === 'all'
      ? this.wallet.totalValueUsd()
      : this.visibleTokens().reduce((sum, token) => sum + token.valueUsd, 0),
  );

  protected readonly summaryLabel = computed(() => {
    const chain = this.selectedChain();
    return chain === 'all' ? 'Valor total' : `Valor em ${CHAIN_LABELS[chain]}`;
  });

  protected readonly summaryCaption = computed(() => {
    const walletCount = this.wallet.wallets().length;
    const prefix = walletCount > 1 ? `${this.wallet.loadedCount()} de ${walletCount} carteiras · ` : '';
    return prefix + this.chainCaption();
  });

  private readonly chainCaption = computed(() => {
    if (this.selectedChain() === 'all') {
      const chains = Object.keys(this.chainCounts()).length;
      return chains === 1 ? 'Ativos em 1 rede' : `Ativos em ${chains} redes`;
    }
    const count = this.visibleTokens().length;
    return count === 1 ? '1 token nesta rede' : `${count} tokens nesta rede`;
  });

  protected onAddress(address: string): void {
    this.selectedChain.set('all');
    this.wallet.add(address);
  }

  protected onRemove(address: string): void {
    this.selectedChain.set('all');
    this.wallet.remove(address);
  }
}
