import { Component, computed, inject, signal } from '@angular/core';
import { CHAIN_LABELS, type ChainId } from '../../../../shared/token';
import { WalletService } from '../../core/wallet.service';
import { ChainFilterComponent, type ChainSelection } from '../chain-filter/chain-filter.component';
import { PortfolioChartComponent } from '../portfolio-chart/portfolio-chart.component';
import { PortfolioSummaryComponent } from '../portfolio-summary/portfolio-summary.component';
import { TokenListComponent } from '../token-list/token-list.component';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    WalletInputComponent,
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

  protected readonly selectedChain = signal<ChainSelection>('all');

  protected readonly chainCounts = computed(() => {
    const counts: Record<ChainId, number> = { ethereum: 0, arbitrum: 0, base: 0 };
    for (const token of this.wallet.tokens()) counts[token.chain]++;
    return counts;
  });

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
    if (this.selectedChain() === 'all') return 'Ethereum · Arbitrum · Base';
    const count = this.visibleTokens().length;
    return count === 1 ? '1 token nesta rede' : `${count} tokens nesta rede`;
  });

  protected onAddress(address: string): void {
    this.selectedChain.set('all');
    this.wallet.load(address);
  }
}
