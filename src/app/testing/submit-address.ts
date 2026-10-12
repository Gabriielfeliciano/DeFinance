import type { ComponentFixture } from '@angular/core/testing';

/** Digita `text` no campo de endereço e envia o formulário. */
export async function submitAddress(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('input#wallet-address')!;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  el.querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}
