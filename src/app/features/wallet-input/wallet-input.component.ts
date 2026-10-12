import { Component, input, output, signal } from '@angular/core';
import { isValidEvmAddress } from '../../../../shared/address';

@Component({
  selector: 'app-wallet-input',
  templateUrl: './wallet-input.component.html',
  styleUrl: './wallet-input.component.scss',
})
export class WalletInputComponent {
  readonly disabled = input(false);
  readonly addressSubmit = output<string>();

  protected readonly value = signal('');
  protected readonly error = signal<string | null>(null);

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const address = this.value().trim();

    if (isValidEvmAddress(address)) {
      this.addressSubmit.emit(address);
      return;
    }

    if (address === '') {
      this.error.set('Cole um endereço de carteira.');
    } else if (/\.eth$/i.test(address)) {
      this.error.set('Nomes ENS ainda não são suportados. Cole o endereço 0x.');
    } else {
      this.error.set('Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.');
    }
  }
}
