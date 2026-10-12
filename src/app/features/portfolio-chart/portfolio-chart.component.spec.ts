import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { ApexStroke, ApexTooltip } from 'ng-apexcharts';
import type { ApexLegend } from 'ng-apexcharts';
import type { TokenItem } from '../../../../shared/token';
import { ThemeService } from '../../core/theme.service';
import { PortfolioChartComponent } from './portfolio-chart.component';

@Component({ selector: 'apx-chart', template: '' })
class ApxChartStub {
  readonly series = input<number[]>();
  readonly labels = input<string[]>();
  readonly chart = input<unknown>();
  readonly colors = input<unknown>();
  readonly legend = input<ApexLegend>();
  readonly dataLabels = input<unknown>();
  readonly stroke = input<ApexStroke>();
  readonly plotOptions = input<unknown>();
  readonly tooltip = input<ApexTooltip>();
}

type LegendOpts = Parameters<NonNullable<ApexLegend['formatter']>>[1];

function token(symbol: string, valueUsd: number, id: string): TokenItem {
  return { id, chain: 'ethereum', symbol, name: symbol, balance: 1, priceUsd: valueUsd, valueUsd };
}

describe('PortfolioChartComponent', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PortfolioChartComponent] })
      .overrideComponent(PortfolioChartComponent, { set: { imports: [ApxChartStub] } })
      .compileComponents();
  });

  it('feeds merged slices and percentage legend to the chart', async () => {
    const fixture = TestBed.createComponent(PortfolioChartComponent);
    fixture.componentRef.setInput('tokens', [
      token('ETH', 600, 'ethereum:native'),
      token('ETH', 400, 'base:native'),
      token('USDC', 500, 'ethereum:0xusdc'),
    ]);
    await fixture.whenStable();

    const chart = fixture.debugElement.query(By.directive(ApxChartStub)).componentInstance as ApxChartStub;
    expect(chart.labels()).toEqual(['ETH', 'USDC']);
    expect(chart.series()).toEqual([1000, 500]);
    expect(chart.legend()?.formatter?.('ETH', { seriesIndex: 0 } as LegendOpts)).toBe('ETH · 66.7%');
  });

  it('repaints legend, slice borders and tooltip when the theme changes', async () => {
    const fixture = TestBed.createComponent(PortfolioChartComponent);
    fixture.componentRef.setInput('tokens', [token('ETH', 600, 'ethereum:native')]);
    await fixture.whenStable();
    const chart = () => fixture.debugElement.query(By.directive(ApxChartStub)).componentInstance as ApxChartStub;

    expect(chart().tooltip()?.theme).toBe('dark');
    const darkStroke = chart().stroke()?.colors;

    TestBed.inject(ThemeService).toggle();
    await fixture.whenStable();

    expect(chart().tooltip()?.theme).toBe('light');
    expect(chart().stroke()?.colors).not.toEqual(darkStroke);
    expect(chart().legend()?.labels?.colors).toBe('#5b6478');
  });
});
