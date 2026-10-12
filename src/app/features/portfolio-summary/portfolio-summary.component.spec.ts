import { TestBed } from '@angular/core/testing';
import { PortfolioSummaryComponent } from './portfolio-summary.component';

describe('PortfolioSummaryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PortfolioSummaryComponent] }).compileComponents();
  });

  it('shows the total formatted as USD and updates with the input', async () => {
    const fixture = TestBed.createComponent(PortfolioSummaryComponent);
    const total = () =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="total"]')?.textContent?.trim();

    fixture.componentRef.setInput('totalValueUsd', 1234.5);
    await fixture.whenStable();
    expect(total()).toBe('$1,234.50');

    fixture.componentRef.setInput('totalValueUsd', 1234567.891);
    await fixture.whenStable();
    expect(total()).toBe('$1,234,567.89');
  });

  it('shows the default label and caption for the whole wallet', async () => {
    const fixture = TestBed.createComponent(PortfolioSummaryComponent);
    fixture.componentRef.setInput('totalValueUsd', 10);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="summary-label"]')?.textContent?.trim()).toBe('Valor total');
    expect(el.querySelector('[data-testid="summary-caption"]')?.textContent?.trim()).toBe('Ethereum · Arbitrum · Base');
  });

  it('accepts a custom label and caption', async () => {
    const fixture = TestBed.createComponent(PortfolioSummaryComponent);
    fixture.componentRef.setInput('totalValueUsd', 10);
    fixture.componentRef.setInput('label', 'Valor em Base');
    fixture.componentRef.setInput('caption', '4 tokens nesta rede');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="summary-label"]')?.textContent?.trim()).toBe('Valor em Base');
    expect(el.querySelector('[data-testid="summary-caption"]')?.textContent?.trim()).toBe('4 tokens nesta rede');
  });
});
