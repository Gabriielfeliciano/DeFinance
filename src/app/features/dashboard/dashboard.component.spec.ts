import { TestBed } from '@angular/core/testing';
import { submitAddress } from '../../testing/submit-address';
import { DashboardComponent } from './dashboard.component';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DashboardComponent] }).compileComponents();
  });

  it('shows the brand heading and the address input', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('DeFinance');
    expect(el.querySelector('app-wallet-input')).not.toBeNull();
  });

  it('confirms a valid submitted address', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    await submitAddress(fixture, ADDRESS);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="pending-address"]')?.textContent).toContain(ADDRESS);
  });
});
