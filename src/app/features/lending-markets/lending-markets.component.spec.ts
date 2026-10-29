import { TestBed } from '@angular/core/testing';
import type { WalletLending } from '../../core/wallet.service';
import { LendingMarketsComponent } from './lending-markets.component';

const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

function market(changes: Partial<WalletLending> = {}): WalletLending {
  return {
    wallet: WALLET,
    id: 'ethereum:v3',
    chain: 'ethereum',
    label: 'Aave v3 Ethereum',
    supplied: [{ underlying: '0xwbtc', symbol: 'WBTC', name: 'Wrapped BTC', balance: 2, valueUsd: 200000 }],
    borrowed: [{ underlying: '0xusdc', symbol: 'USDC', name: 'USD Coin', balance: 1000, valueUsd: 1000 }],
    healthFactor: 1.38,
    ...changes,
  };
}

describe('LendingMarketsComponent', () => {
  async function render(markets: WalletLending[], showWallet = false) {
    await TestBed.configureTestingModule({ imports: [LendingMarketsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LendingMarketsComponent);
    fixture.componentRef.setInput('markets', markets);
    fixture.componentRef.setInput('showWallet', showWallet);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders one card per market with title and rows', async () => {
    const el = await render([market(), market({ id: 'base:v3', label: 'Aave v3 Base', chain: 'base' })]);
    const cards = el.querySelectorAll('[data-testid="lending-card"]');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('[data-testid="lending-title"]')?.textContent?.trim()).toBe('Aave v3 Ethereum');
    const text = cards[0].textContent ?? '';
    expect(text).toContain('Depositado');
    expect(text).toContain('Emprestado');
    expect(text).toContain('WBTC');
    expect(text).toContain('$200,000.00');
    expect(text).toContain('USDC');
  });

  it('shows the health factor badge with a class per level', async () => {
    const el = await render([
      market({ healthFactor: 1.05 }),
      market({ healthFactor: 1.38 }),
      market({ healthFactor: 2 }),
    ]);
    const badges = el.querySelectorAll('[data-testid="lending-hf"]');
    expect(badges[0].classList).toContain('hf--danger');
    expect(badges[1].classList).toContain('hf--warning');
    expect(badges[1].textContent?.trim()).toBe('Health factor 1,38');
    expect(badges[2].classList).toContain('hf--safe');
  });

  it('omits the badge when there is no health factor', async () => {
    const el = await render([market({ healthFactor: null, borrowed: [] })]);
    expect(el.querySelector('[data-testid="lending-hf"]')).toBeNull();
    expect(el.textContent).not.toContain('Emprestado');
  });

  it('shows the short wallet address only when asked', async () => {
    expect((await render([market()], true)).querySelector('[data-testid="lending-wallet"]')?.textContent).toContain('0xd8dA…6045');
    TestBed.resetTestingModule();
    expect((await render([market()], false)).querySelector('[data-testid="lending-wallet"]')).toBeNull();
  });
});
