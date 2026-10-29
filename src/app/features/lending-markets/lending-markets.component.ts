import { Component, input } from '@angular/core';
import { formatAmount, formatUsd, shortAddress } from '../../core/format';
import { formatHealthFactor, healthLevel } from '../../core/lending';
import type { WalletLending } from '../../core/wallet.service';

/** Um cartão por mercado da Aave: depositado, emprestado e health factor. */
@Component({
  selector: 'app-lending-markets',
  templateUrl: './lending-markets.component.html',
  styleUrl: './lending-markets.component.scss',
})
export class LendingMarketsComponent {
  readonly markets = input.required<WalletLending[]>();
  /** Mostra a carteira dona da posição (só com mais de uma carteira). */
  readonly showWallet = input(false);

  protected readonly short = shortAddress;
  protected readonly usd = formatUsd;
  protected readonly amount = formatAmount;
  protected readonly level = healthLevel;
  protected readonly hf = formatHealthFactor;
}
