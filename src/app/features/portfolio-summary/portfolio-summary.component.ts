import { Component, computed, input } from '@angular/core';
import { formatUsd } from '../../core/format';

@Component({
  selector: 'app-portfolio-summary',
  template: `
    <span class="label" data-testid="summary-label">{{ label() }}</span>
    <strong class="total" data-testid="total">{{ formattedTotal() }}</strong>
    @if (breakdown(); as breakdown) {
      <span class="breakdown" data-testid="summary-breakdown">{{ breakdown }}</span>
    }
    <span class="networks" data-testid="summary-caption">{{ caption() }}</span>
  `,
  styleUrl: './portfolio-summary.component.scss',
})
export class PortfolioSummaryComponent {
  readonly totalValueUsd = input.required<number>();
  readonly label = input('Valor total');
  readonly caption = input('Ethereum · Arbitrum · Base');
  /** Carteira, depositado e dívida; `null` sem posição na Aave. */
  readonly breakdown = input<string | null>(null);

  protected readonly formattedTotal = computed(() => formatUsd(this.totalValueUsd()));
}
