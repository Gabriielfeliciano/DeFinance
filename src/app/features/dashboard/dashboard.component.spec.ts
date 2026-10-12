import { signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import type { TokenItem } from '../../../../shared/token';
import { WalletService, type WalletStatus } from '../../core/wallet.service';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

class FakeWalletService {
  readonly status = signal<WalletStatus>('idle');
  readonly tokens = signal<TokenItem[]>([]);
  readonly totalValueUsd = signal(0);
  readonly load = vi.fn<(address: string) => void>();
  readonly retry = vi.fn<() => void>();
}

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ETH: TokenItem = {
  id: 'ethereum:native',
  chain: 'ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  balance: 0.2,
  priceUsd: 4600,
  valueUsd: 920,
};

describe('DashboardComponent', () => {
  let wallet: FakeWalletService;

  async function render() {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: WalletService, useClass: FakeWalletService }],
      // O gráfico fica no placeholder: o ApexCharts real não roda em jsdom.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();
    wallet = TestBed.inject(WalletService) as unknown as FakeWalletService;
  });

  it('shows the brand heading and the address input', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('DeFinance');
    expect(el.querySelector('app-wallet-input')).not.toBeNull();
  });

  it('loads the wallet when a valid address is submitted', async () => {
    const { fixture } = await render();
    await submitAddress(fixture, ADDRESS);
    expect(wallet.load).toHaveBeenCalledWith(ADDRESS);
  });

  it('renders the token list on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelectorAll('[data-testid="token-row"]').length).toBe(1);
  });

  it('renders the portfolio total on success', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    wallet.totalValueUsd.set(920);
    const { el } = await render();
    expect(el.querySelector('[data-testid="total"]')?.textContent?.trim()).toBe('$920.00');
  });

  it('reserves the chart slot on success while the chart chunk loads', async () => {
    wallet.status.set('success');
    wallet.tokens.set([ETH]);
    const { el } = await render();
    expect(el.querySelector('[data-testid="chart-placeholder"]')).not.toBeNull();
  });

  it('explains the read-only promise while idle', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="idle"]')?.textContent).toContain('Somente leitura');
  });

  it('shows a skeleton and locks the input while loading', async () => {
    wallet.status.set('loading');
    const { el } = await render();
    const loading = el.querySelector('[data-testid="loading"]');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(el.querySelector<HTMLInputElement>('input#wallet-address')!.disabled).toBe(true);
  });

  it('shows an error banner whose button retries', async () => {
    wallet.status.set('error');
    const { el } = await render();
    const banner = el.querySelector('[data-testid="error"]');
    expect(banner?.getAttribute('role')).toBe('alert');
    banner!.querySelector<HTMLButtonElement>('button')!.click();
    expect(wallet.retry).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly message for a wallet without priced tokens', async () => {
    wallet.status.set('empty');
    const { el } = await render();
    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain(
      'Nenhum ativo com valor de mercado encontrado',
    );
  });
});
