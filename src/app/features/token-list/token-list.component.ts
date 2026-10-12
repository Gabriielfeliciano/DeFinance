import { Component, computed, input, signal } from '@angular/core';
import { CHAIN_LABELS, type TokenItem } from '../../../../shared/token';
import { formatAmount, formatPrice, formatUsd } from '../../core/format';

@Component({
  selector: 'app-token-list',
  templateUrl: './token-list.component.html',
  styleUrl: './token-list.component.scss',
})
export class TokenListComponent {
  readonly tokens = input.required<TokenItem[]>();

  protected readonly sortedTokens = computed(() =>
    [...this.tokens()].sort((a, b) => b.valueUsd - a.valueUsd),
  );
  protected readonly chainLabels = CHAIN_LABELS;
  protected readonly formatAmount = formatAmount;
  protected readonly formatPrice = formatPrice;
  protected readonly formatUsd = formatUsd;

  private readonly brokenLogos = signal<ReadonlySet<string>>(new Set());

  protected showLogo(token: TokenItem): boolean {
    return !!token.logoUrl && !this.brokenLogos().has(token.id);
  }

  protected onLogoError(tokenId: string): void {
    this.brokenLogos.update((ids) => new Set(ids).add(tokenId));
  }
}
