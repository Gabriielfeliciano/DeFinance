import { Component, computed, input, output, signal } from '@angular/core';
import { isValidEvmAddress } from '../../../../shared/address';

@Component({
  selector: 'app-wallet-input',
  templateUrl: './wallet-input.component.html',
  styleUrl: './wallet-input.component.scss',
})
export class WalletInputComponent {
  readonly disabled = input(false);
  /** Carteiras já adicionadas: recusa repetidas e conta o limite. */
  readonly addresses = input<string[]>([]);
  readonly max = input(3);
  readonly addressSubmit = output<string>();

  protected readonly value = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly full = computed(() => this.addresses().length >= this.max());
  protected readonly locked = computed(() => this.disabled() || this.full());
  protected readonly placeholder = computed(() => {
    const count = this.addresses().length;
    if (count === 0) return '0x…';
    if (this.full()) return `${count} de ${this.max()} carteiras`;
    return `Adicionar carteira (${count} de ${this.max()})`;
  });
  protected readonly buttonLabel = computed(() => (this.addresses().length === 0 ? 'Ver carteira' : 'Adicionar'));

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const address = this.value().trim();

    if (isValidEvmAddress(address)) {
      if (this.addresses().some((added) => added.toLowerCase() === address.toLowerCase())) {
        this.error.set('Essa carteira já foi adicionada.');
        return;
      }
      this.addressSubmit.emit(address);
      this.value.set('');
      // O binding não vê mudança se o sinal voltou a '' antes da detecção: limpa o DOM também.
      (event.target as HTMLFormElement).reset();
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
