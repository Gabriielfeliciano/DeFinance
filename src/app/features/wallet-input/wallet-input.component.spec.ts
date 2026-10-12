import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { submitAddress } from '../../testing/submit-address';
import { WalletInputComponent } from './wallet-input.component';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('WalletInputComponent', () => {
  let fixture: ComponentFixture<WalletInputComponent>;
  let emitted: string[];

  const el = () => fixture.nativeElement as HTMLElement;
  const errorText = () =>
    el().querySelector('[data-testid="address-error"]')?.textContent?.trim() ?? null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WalletInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(WalletInputComponent);
    emitted = [];
    fixture.componentInstance.addressSubmit.subscribe((address) => emitted.push(address));
    await fixture.whenStable();
  });

  it('emits a valid address', async () => {
    await submitAddress(fixture, ADDRESS);
    expect(emitted).toEqual([ADDRESS]);
    expect(errorText()).toBeNull();
  });

  it('trims whitespace and line breaks from pasted addresses', async () => {
    await submitAddress(fixture, `  ${ADDRESS}\n`);
    expect(emitted).toEqual([ADDRESS]);
  });

  it('shows an inline error and does not emit for a malformed address', async () => {
    await submitAddress(fixture, '0x123');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.');
    expect(el().querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('asks for an address when submitted empty', async () => {
    await submitAddress(fixture, '   ');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Cole um endereço de carteira.');
  });

  it('explains that ENS names are not supported', async () => {
    await submitAddress(fixture, 'vitalik.eth');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Nomes ENS ainda não são suportados. Cole o endereço 0x.');
  });

  it('clears the error as soon as the user edits the field', async () => {
    await submitAddress(fixture, '0x123');
    const input = el().querySelector('input')!;
    input.value = '0x1234';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(errorText()).toBeNull();
  });

  it('disables the field and the button when disabled', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(el().querySelector('input')!.disabled).toBe(true);
    expect(el().querySelector('button')!.disabled).toBe(true);
  });
});
