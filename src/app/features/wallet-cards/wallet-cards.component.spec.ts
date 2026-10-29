import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { WalletState } from '../../core/portfolio';
import { WalletCardsComponent } from './wallet-cards.component';

const ADDRESS_A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ADDRESS_B = '0x1a2B000000000000000000000000000000009f3c';

function wallet(address: string, changes: Partial<WalletState> = {}): WalletState {
  return { address, enabled: true, status: 'success', tokens: [], totalValueUsd: 920, failedChains: [], lending: [], lendingFailed: false, ...changes };
}

describe('WalletCardsComponent', () => {
  let fixture: ComponentFixture<WalletCardsComponent>;
  const events: Record<'toggle' | 'remove' | 'retry', string[]> = { toggle: [], remove: [], retry: [] };

  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () => [...el().querySelectorAll<HTMLElement>('[data-testid="wallet-card"]')];

  async function render(wallets: WalletState[]) {
    fixture.componentRef.setInput('wallets', wallets);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WalletCardsComponent] }).compileComponents();
    fixture = TestBed.createComponent(WalletCardsComponent);
    events.toggle = [];
    events.remove = [];
    events.retry = [];
    fixture.componentInstance.toggle.subscribe((address) => events.toggle.push(address));
    fixture.componentInstance.remove.subscribe((address) => events.remove.push(address));
    fixture.componentInstance.retry.subscribe((address) => events.retry.push(address));
  });

  it('renders one card per wallet with the short address and its total', async () => {
    await render([wallet(ADDRESS_A), wallet(ADDRESS_B, { totalValueUsd: 0, status: 'empty' })]);
    expect(cards().length).toBe(2);
    expect(cards()[0].textContent).toContain('0xd8dA…6045');
    expect(cards()[0].querySelector('[data-testid="wallet-card-total"]')?.textContent?.trim()).toBe('$920.00');
    expect(cards()[1].querySelector('[data-testid="wallet-card-total"]')?.textContent?.trim()).toBe('$0.00');
  });

  it('emits toggle from the checkbox and remove from the close button', async () => {
    await render([wallet(ADDRESS_A), wallet(ADDRESS_B)]);
    cards()[1].querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    cards()[1].querySelector<HTMLButtonElement>('[aria-label="Remover 0x1a2B…9f3c"]')!.click();
    expect(events.toggle).toEqual([ADDRESS_B]);
    expect(events.remove).toEqual([ADDRESS_B]);
  });

  it('disables the checkbox of the only enabled wallet', async () => {
    await render([wallet(ADDRESS_A), wallet(ADDRESS_B, { enabled: false })]);
    const [first, second] = cards().map((card) => card.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
    expect(first.disabled).toBe(true);
    expect(first.checked).toBe(true);
    expect(second.disabled).toBe(false);
    expect(second.checked).toBe(false);
    expect(cards()[1].classList).toContain('wallet-card--off');
  });

  it('fades only the content of a disabled card, never its controls', async () => {
    await render([wallet(ADDRESS_A), wallet(ADDRESS_B, { enabled: false })]);
    const off = cards()[1];
    expect(getComputedStyle(off).opacity).not.toBe('0.45');
    expect(getComputedStyle(off.querySelector('.address')!).opacity).toBe('0.45');
    expect(getComputedStyle(off.querySelector('.value')!).opacity).toBe('0.45');
  });

  it('gives the remove button a tap target of at least 32px', async () => {
    await render([wallet(ADDRESS_A)]);
    const remove = cards()[0].querySelector<HTMLButtonElement>('.remove')!;
    expect(getComputedStyle(remove).minWidth).toBe('32px');
    expect(getComputedStyle(remove).minHeight).toBe('32px');
  });

  it('shows a skeleton while the wallet loads', async () => {
    await render([wallet(ADDRESS_A, { status: 'loading' })]);
    expect(cards()[0].querySelector('[data-testid="wallet-card-loading"]')).not.toBeNull();
    expect(cards()[0].querySelector('[data-testid="wallet-card-total"]')).toBeNull();
  });

  it('shows an error with a retry button that emits retry', async () => {
    await render([wallet(ADDRESS_A, { status: 'error' })]);
    expect(cards()[0].textContent).toContain('Não foi possível carregar');
    [...cards()[0].querySelectorAll('button')].find((b) => b.textContent?.includes('Tentar novamente'))!.click();
    expect(events.retry).toEqual([ADDRESS_A]);
  });
});
