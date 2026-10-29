import { Component, computed, inject, linkedSignal } from '@angular/core';
import { CHAIN_LABELS, EVM_CHAINS, type ChainId } from '../../../../shared/token';
import { formatUsd, shortAddress } from '../../core/format';
import { lendingTotals, suppliesAsTokens } from '../../core/lending';
import { MAX_WALLETS, WalletService } from '../../core/wallet.service';
import { ChainFilterComponent, type ChainSelection } from '../chain-filter/chain-filter.component';
import { LendingMarketsComponent } from '../lending-markets/lending-markets.component';
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
    LendingMarketsComponent,
    TokenListComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly wallet = inject(WalletService);
  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected readonly evmChainCount = EVM_CHAINS.length;
  protected readonly maxWallets = MAX_WALLETS;

  protected readonly addresses = computed(() => this.wallet.wallets().map((wallet) => wallet.address));

  protected readonly chainCounts = computed(() => {
    const counts: Partial<Record<ChainId, number>> = {};
    for (const token of this.wallet.tokens()) counts[token.chain] = (counts[token.chain] ?? 0) + 1;
    for (const market of this.wallet.lending()) counts[market.chain] = (counts[market.chain] ?? 0) + 1;
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

  /** Posições da Aave na rede escolhida. */
  protected readonly visibleLending = computed(() => {
    const chain = this.selectedChain();
    const markets = this.wallet.lending();
    return chain === 'all' ? markets : markets.filter((market) => market.chain === chain);
  });

  protected readonly hasLending = computed(() => this.visibleLending().length > 0);

  /** Só mostra a carteira dona do cartão quando há mais de uma. */
  protected readonly showWallet = computed(() => this.wallet.wallets().length > 1);

  /** Tokens visíveis mais os ativos depositados na Aave; dívidas ficam fora do gráfico. */
  protected readonly chartTokens = computed(() => [
    ...this.visibleTokens(),
    ...suppliesAsTokens(this.visibleLending()),
  ]);

  private readonly walletTokensUsd = computed(() =>
    this.visibleTokens().reduce((sum, token) => sum + token.valueUsd, 0),
  );

  /** Valor líquido (pode ser negativo): tokens + depositado - dívida. */
  protected readonly visibleTotal = computed(() => {
    const { suppliedUsd, borrowedUsd } = lendingTotals(this.visibleLending());
    return this.walletTokensUsd() + suppliedUsd - borrowedUsd;
  });

  protected readonly breakdown = computed(() => {
    if (!this.hasLending()) return null;
    const { suppliedUsd, borrowedUsd } = lendingTotals(this.visibleLending());
    return `Carteira ${formatUsd(this.walletTokensUsd())} · Aave depositado ${formatUsd(suppliedUsd)} · dívida −${formatUsd(borrowedUsd)}`;
  });

  protected readonly summaryLabel = computed(() => {
    const chain = this.selectedChain();
    const base = this.hasLending() ? 'Patrimônio líquido' : 'Valor total';
    if (chain === 'all') return base;
    return this.hasLending() ? `${base} em ${CHAIN_LABELS[chain]}` : `Valor em ${CHAIN_LABELS[chain]}`;
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
    const count = this.visibleTokens().length + this.visibleLending().length;
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
