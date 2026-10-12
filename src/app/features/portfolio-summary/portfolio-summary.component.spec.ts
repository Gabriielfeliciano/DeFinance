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
});
