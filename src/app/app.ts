import { Component } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ThemeToggleComponent } from './features/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
