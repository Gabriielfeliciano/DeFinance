import { Component, computed, input, output } from '@angular/core';
import { CHAIN_LABELS, CHAINS, type ChainId } from '../../../../shared/token';

export type ChainSelection = ChainId | 'all';

@Component({
  selector: 'app-chain-filter',
  templateUrl: './chain-filter.component.html',
  styleUrl: './chain-filter.component.scss',
})
export class ChainFilterComponent {
  readonly selected = input.required<ChainSelection>();
  /** Rede ausente conta como zero. */
  readonly counts = input.required<Partial<Record<ChainId, number>>>();
  readonly selectedChange = output<ChainSelection>();

  protected readonly labels = CHAIN_LABELS;
  /** Só as redes com tokens: com 16 redes, chips vazios viram ruído. */
  protected readonly chains = computed(() => CHAINS.filter((chain) => (this.counts()[chain] ?? 0) > 0));
  protected readonly total = computed(() => this.chains().reduce((sum, chain) => sum + this.counts()[chain]!, 0));
}
