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
  readonly counts = input.required<Record<ChainId, number>>();
  readonly selectedChange = output<ChainSelection>();

  protected readonly chains = CHAINS;
  protected readonly labels = CHAIN_LABELS;
  protected readonly total = computed(() => CHAINS.reduce((sum, chain) => sum + this.counts()[chain], 0));
}
