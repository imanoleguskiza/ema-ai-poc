import { Component, Input, OnChanges, SimpleChanges, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HighchartsChartComponent, providePartialHighcharts } from 'highcharts-angular';
import type * as Highcharts from 'highcharts';

type DonutPoint = { name: string; y: number };

@Component({
  standalone: true,
  selector: 'app-kpi-gauge',
  imports: [CommonModule, HighchartsChartComponent],
  template: `
    <highcharts-chart
      *ngIf="isBrowser"
      class="chart"
      [options]="options"
      (chartInstance)="onChartInstance($event)">
    </highcharts-chart>
  `,
  providers: [
    providePartialHighcharts({
      modules: () => [
        import('highcharts/esm/modules/no-data-to-display'),
      ],
    }),
  ],
})
export class KpiGaugeComponent implements OnChanges {
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private chart?: Highcharts.Chart;

  @Input() title = '';
  @Input() centerText = '';
  @Input() data: DonutPoint[] = [];
  @Input() value: number | null = null;
  @Input() color: string | null = null;
  @Input() trackColor: string | null = null;
  @Input() hoverSuffix = '';
  @Input() className = 'donut--gauge legend-styled-items hc-swatch-3 gradient--x flat-end';
  @Input() locale = 'en-GB';
  @Input() useStyledMode = true;
  @Input() decimals = 2;

  options: Highcharts.Options = this.buildOptions([]);

  onChartInstance(chart: Highcharts.Chart) {
    this.chart = chart;
    chart.update({ lang: { loading: 'Loading…' } }, false);
    if (!this.hasData()) chart.showLoading(); else chart.hideLoading();
  }

  ngOnChanges(_: SimpleChanges) {
    const points = this.resolvePoints();
    this.options = this.buildOptions(points);
    if (this.chart) (this.hasData() ? this.chart.hideLoading() : this.chart.showLoading());
  }

  private hasData(): boolean {
    return (this.data && this.data.length > 0) || typeof this.value === 'number';
  }

  private resolvePoints(): DonutPoint[] {
    if (this.data && this.data.length > 0) {
      return this.data.map((p: DonutPoint) => ({ name: p.name, y: Number(p.y) || 0 }));
    }
    if (typeof this.value === 'number') {
      const ratio = Math.max(0, Math.min(1, this.value));
      const yes = Math.round(ratio * 100);
      const rest = Math.max(0, 100 - yes);
      return [
        { name: 'Processed', y: yes },
        { name: 'Rest', y: rest },
      ];
    }
    return [];
  }

  private buildOptions(points: DonutPoint[]): Highcharts.Options {
    const total = points.reduce((acc: number, p: DonutPoint) => acc + (p.y || 0), 0);
    const startAngle = 0;
    const endAngle = 360;
    const primary = this.color ?? '#80b9de';
    const rest = this.trackColor ?? '#586671';

    return {
      chart: {
        type: 'pie',
        styledMode: this.useStyledMode,
        className: this.className,
        spacing: [16, 24, 16, 24]
      },
      title: { text: this.title, align: 'left' },
      subtitle: {
        text: '',
        useHTML: true
      },
      credits: { enabled: false },
      tooltip: { enabled: false },
      colors: this.useStyledMode ? undefined : [primary, rest],
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            distance: 18,
            connectorPadding: 8,
            connectorWidth: 1,
            softConnector: true,
            useHTML: true,
            formatter: function (this: any) {
              const p = this.point as Highcharts.Point & { name: string; y: number };
              const pct = total > 0 ? (p.y / total) * 100 : 0;
              return `<span class="hc-label"><b>${p.name}</b> ${pct.toFixed(0)}%</span>`;
            },
            style: this.useStyledMode ? undefined : { fontSize: '11px', fontWeight: '600' }
          },
          startAngle,
          endAngle,
          center: ['33%', '50%'],
          size: '80%',
          innerSize: '70%',
          showInLegend: false
        }
      },
      series: [{
        type: 'pie',
        data: points.map((p: DonutPoint) => [p.name, p.y]) as Highcharts.PointOptionsType[],
        animation: { duration: 600 }
      }]
    };
  }
}
