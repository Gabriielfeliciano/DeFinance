import { Component, signal } from '@angular/core';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

@Component({
  selector: 'app-dashboard',
  imports: [WalletInputComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly address = signal<string | null>(null);

  protected onAddress(address: string): void {
    this.address.set(address);
  }
}
