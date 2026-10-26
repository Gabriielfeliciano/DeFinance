import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChainId } from '../../../../shared/token';
import { ChainFilterComponent, type ChainSelection } from './chain-filter.component';

describe('ChainFilterComponent', () => {
  let fixture: ComponentFixture<ChainFilterComponent>;
  let emitted: ChainSelection[];

  const el = () => fixture.nativeElement as HTMLElement;
  const chip = (id: string) => el().querySelector<HTMLButtonElement>(`[data-testid="chip-${id}"]`);
  const chipText = (id: string) => chip(id)?.textContent?.replace(/\s+/g, ' ').trim();

  async function render(selected: ChainSelection, counts: Partial<Record<ChainId, number>>) {
    await TestBed.configureTestingModule({ imports: [ChainFilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(ChainFilterComponent);
    emitted = [];
    fixture.componentInstance.selectedChange.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('selected', selected);
    fixture.componentRef.setInput('counts', counts);
    await fixture.whenStable();
  }

  it('shows "Todas" plus one chip per chain that has tokens, each with its count', async () => {
    await render('all', { ethereum: 6, polygon: 3, hyperevm: 4 });
    expect(chipText('all')).toBe('Todas 13');
    expect(chipText('ethereum')).toBe('Ethereum 6');
    expect(chipText('polygon')).toBe('Polygon 3');
    expect(chipText('hyperevm')).toBe('HyperEVM 4');
  });

  it('hides chains where the wallet has no tokens', async () => {
    await render('all', { ethereum: 6, arbitrum: 0, base: 4 });
    const chips = [...el().querySelectorAll('[data-testid^="chip-"]')].map((c) => c.getAttribute('data-testid'));
    expect(chips).toEqual(['chip-all', 'chip-ethereum', 'chip-base']);
  });

  it('marks only the selected chip as pressed', async () => {
    await render('arbitrum', { ethereum: 6, arbitrum: 3, base: 4 });
    expect(chip('arbitrum')!.getAttribute('aria-pressed')).toBe('true');
    expect(chip('all')!.getAttribute('aria-pressed')).toBe('false');
    expect(chip('ethereum')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('emits the chosen chain', async () => {
    await render('all', { ethereum: 6, arbitrum: 3, base: 4 });
    chip('base')!.click();
    chip('all')!.click();
    expect(emitted).toEqual(['base', 'all']);
  });
});
