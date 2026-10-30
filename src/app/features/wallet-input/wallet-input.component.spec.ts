import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { submitAddress } from '../../testing/submit-address';
import { WalletInputComponent } from './wallet-input.component';

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const OTHER = '0x1111111111111111111111111111111111111111';
const ANOTHER = '0x2222222222222222222222222222222222222222';
const SOLANA = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
const SOLANA_OTHER_CASE = '86XCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';

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

  it('emits a Solana address, trimmed', async () => {
    await submitAddress(fixture, `  ${SOLANA}
`);
    expect(emitted).toEqual([SOLANA]);
    expect(errorText()).toBeNull();
  });

  it('refuses the same Solana address twice', async () => {
    fixture.componentRef.setInput('addresses', [SOLANA]);
    await fixture.whenStable();
    await submitAddress(fixture, SOLANA);
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Essa carteira já foi adicionada.');
  });

  it('accepts a Solana address that differs from an added one only in case', async () => {
    fixture.componentRef.setInput('addresses', [SOLANA]);
    await fixture.whenStable();
    await submitAddress(fixture, SOLANA_OTHER_CASE);
    expect(emitted).toEqual([SOLANA_OTHER_CASE]);
  });

  it('refuses an EVM address in another case', async () => {
    fixture.componentRef.setInput('addresses', [ADDRESS]);
    await fixture.whenStable();
    await submitAddress(fixture, ADDRESS.toLowerCase());
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Essa carteira já foi adicionada.');
  });

  it('trims whitespace and line breaks from pasted addresses', async () => {
    await submitAddress(fixture, `  ${ADDRESS}\n`);
    expect(emitted).toEqual([ADDRESS]);
  });

  it('shows an inline error and does not emit for a malformed address', async () => {
    await submitAddress(fixture, '0x123');
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Endereço inválido. Use um endereço EVM (0x…) ou Solana.');
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

  it('refuses an address already added, in any case', async () => {
    fixture.componentRef.setInput('addresses', [ADDRESS]);
    await submitAddress(fixture, ADDRESS.toLowerCase());
    expect(emitted).toEqual([]);
    expect(errorText()).toBe('Essa carteira já foi adicionada.');
  });

  it('clears the field after a valid submit', async () => {
    await submitAddress(fixture, ADDRESS);
    expect(el().querySelector('input')!.value).toBe('');
  });

  it('disables the field when the limit is reached', async () => {
    fixture.componentRef.setInput('addresses', [ADDRESS, OTHER, ANOTHER]);
    await fixture.whenStable();
    expect(el().querySelector('input')!.disabled).toBe(true);
    expect(el().querySelector('button')!.disabled).toBe(true);
    expect(el().querySelector('input')!.placeholder).toBe('3 de 3 carteiras');
  });

  it('shows the wallet count in the placeholder and switches the button label', async () => {
    expect(el().querySelector('input')!.placeholder).toBe('Endereço EVM (0x…) ou Solana');
    expect(el().querySelector('button')!.textContent?.trim()).toBe('Ver carteira');
    fixture.componentRef.setInput('addresses', [ADDRESS]);
    await fixture.whenStable();
    expect(el().querySelector('input')!.placeholder).toBe('Adicionar carteira (1 de 3)');
    expect(el().querySelector('button')!.textContent?.trim()).toBe('Adicionar');
  });
});
