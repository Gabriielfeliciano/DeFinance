import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChainId } from '../../../../shared/token';
import { ChainFilterComponent, type ChainSelection } from './chain-filter.component';

describe('ChainFilterComponent', () => {
  let fixture: ComponentFixture<ChainFilterComponent>;
  let emitted: ChainSelection[];

  const chip = (id: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="chip-${id}"]`)!;

  async function render(selected: ChainSelection, counts: Record<ChainId, number>) {
    await TestBed.configureTestingModule({ imports: [ChainFilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(ChainFilterComponent);
    emitted = [];
    fixture.componentInstance.selectedChange.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('selected', selected);
    fixture.componentRef.setInput('counts', counts);
    await fixture.whenStable();
  }

  it('shows one chip per chain plus "Todas", each with its token count', async () => {
    await render('all', { ethereum: 6, arbitrum: 3, base: 4 });
    expect(chip('all').textContent?.replace(/\s+/g, ' ').trim()).toBe('Todas 13');
    expect(chip('ethereum').textContent?.replace(/\s+/g, ' ').trim()).toBe('Ethereum 6');
    expect(chip('arbitrum').textContent?.replace(/\s+/g, ' ').trim()).toBe('Arbitrum 3');
    expect(chip('base').textContent?.replace(/\s+/g, ' ').trim()).toBe('Base 4');
  });

  it('marks only the selected chip as pressed', async () => {
    await render('arbitrum', { ethereum: 6, arbitrum: 3, base: 4 });
    expect(chip('arbitrum').getAttribute('aria-pressed')).toBe('true');
    expect(chip('all').getAttribute('aria-pressed')).toBe('false');
    expect(chip('ethereum').getAttribute('aria-pressed')).toBe('false');
  });

  it('disables chains without tokens', async () => {
    await render('all', { ethereum: 6, arbitrum: 0, base: 4 });
    expect(chip('arbitrum').disabled).toBe(true);
    expect(chip('base').disabled).toBe(false);
  });

  it('emits the chosen chain', async () => {
    await render('all', { ethereum: 6, arbitrum: 3, base: 4 });
    chip('base').click();
    chip('all').click();
    expect(emitted).toEqual(['base', 'all']);
  });
});
