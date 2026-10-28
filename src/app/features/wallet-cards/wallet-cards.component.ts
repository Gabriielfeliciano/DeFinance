import { Component, computed, input, output } from '@angular/core';
import { formatUsd, shortAddress } from '../../core/format';
import type { WalletState } from '../../core/portfolio';

@Component({
  selector: 'app-wallet-cards',
  templateUrl: './wallet-cards.component.html',
  styleUrl: './wallet-cards.component.scss',
})
export class WalletCardsComponent {
  readonly wallets = input.required<WalletState[]>();
  /** Todos emitem o endereço da carteira. */
  readonly toggle = output<string>();
  readonly remove = output<string>();
  readonly retry = output<string>();

  /** A última carteira ligada não pode ser desligada. */
  protected readonly enabledCount = computed(() => this.wallets().filter((wallet) => wallet.enabled).length);

  protected readonly short = shortAddress;
  protected readonly usd = formatUsd;
}
