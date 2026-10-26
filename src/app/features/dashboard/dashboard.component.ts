import { Component, computed, inject, signal } from '@angular/core';
import { CHAIN_LABELS, CHAINS, type ChainId } from '../../../../shared/token';
import { WalletService } from '../../core/wallet.service';
import { ChainFilterComponent, type ChainSelection } from '../chain-filter/chain-filter.component';
import { PortfolioChartComponent } from '../portfolio-chart/portfolio-chart.component';
import { PortfolioSummaryComponent } from '../portfolio-summary/portfolio-summary.component';
import { TokenListComponent } from '../token-list/token-list.component';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

const LIST_FORMAT = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

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

  protected readonly chainCount = CHAINS.length;

  protected readonly chainCounts = computed(() => {
    const counts: Partial<Record<ChainId, number>> = {};
    for (const token of this.wallet.tokens()) counts[token.chain] = (counts[token.chain] ?? 0) + 1;
    return counts;
  });

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
    if (this.selectedChain() === 'all') {
      const chains = Object.keys(this.chainCounts()).length;
      return chains === 1 ? 'Ativos em 1 rede' : `Ativos em ${chains} redes`;
    }
    const count = this.visibleTokens().length;
    return count === 1 ? '1 token nesta rede' : `${count} tokens nesta rede`;
  });

  protected onAddress(address: string): void {
    this.selectedChain.set('all');
    this.wallet.load(address);
  }
}
