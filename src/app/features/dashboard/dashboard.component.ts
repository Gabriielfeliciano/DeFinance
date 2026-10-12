import { Component, inject } from '@angular/core';
import { WalletService } from '../../core/wallet.service';
import { TokenListComponent } from '../token-list/token-list.component';
import { WalletInputComponent } from '../wallet-input/wallet-input.component';

@Component({
  selector: 'app-dashboard',
  imports: [WalletInputComponent, TokenListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly wallet = inject(WalletService);

  protected onAddress(address: string): void {
    this.wallet.load(address);
  }
}
