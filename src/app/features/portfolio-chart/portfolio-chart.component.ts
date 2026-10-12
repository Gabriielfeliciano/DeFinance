import { Component, computed, input } from '@angular/core';
import {
  ChartComponent,
  type ApexChart,
  type ApexDataLabels,
  type ApexLegend,
  type ApexPlotOptions,
  type ApexStroke,
  type ApexTooltip,
} from 'ng-apexcharts';
import type { TokenItem } from '../../../../shared/token';
import { formatUsd } from '../../core/format';
import { toChartData } from './chart-data';

/** Última cor (cinza) fica para "Outros" quando há 7 fatias. */
export const CHART_COLORS = ['#7c5cff', '#2dd4bf', '#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#64748b'];

@Component({
  selector: 'app-portfolio-chart',
  imports: [ChartComponent],
  templateUrl: './portfolio-chart.component.html',
  styleUrl: './portfolio-chart.component.scss',
})
export class PortfolioChartComponent {
  readonly tokens = input.required<TokenItem[]>();

  protected readonly data = computed(() => toChartData(this.tokens()));

  protected readonly legend = computed<ApexLegend>(() => {
    const percents = this.data().percents;
    return {
      position: 'bottom',
      labels: { colors: '#8b93a7' },
      formatter: (label: string, opts?: { seriesIndex: number }) =>
        `${label} · ${percents[opts?.seriesIndex ?? 0]}%`,
    };
  });

  protected readonly chart: ApexChart = {
    type: 'donut',
    height: 320,
    background: 'transparent',
    fontFamily: 'inherit',
  };
  protected readonly colors = CHART_COLORS;
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly stroke: ApexStroke = { width: 2, colors: ['#121722'] };
  protected readonly plotOptions: ApexPlotOptions = { pie: { donut: { size: '68%' } } };
  protected readonly tooltip: ApexTooltip = {
    theme: 'dark',
    y: { formatter: (value: number) => formatUsd(value) },
  };
}
