import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HighchartsChartComponent, providePartialHighcharts } from 'highcharts-angular';
import type * as Highcharts from 'highcharts';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  standalone: true,
  selector: 'app-mentions-timeline-weekly',
  imports: [CommonModule, HighchartsChartComponent],
  template: `
    <highcharts-chart
      *ngIf="isBrowser"
      class="chart"
      [options]="options"
      (chartInstance)="onChartInstance($event)">
    </highcharts-chart>
  `,
  styles: [`.chart{width:100%;height:100%;display:block}`],
  providers: [
    providePartialHighcharts({
      modules: () => [ import('highcharts/esm/modules/no-data-to-display') ]
    })
  ]
})
export class MentionsTimelineWeeklyComponent implements OnInit {
  private supabase = inject(SupabaseService);
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private chart?: Highcharts.Chart;

  private line = '#80b9de';
  private area = 'rgba(128,185,222,0.25)';

  options: Highcharts.Options = {
    chart: { type: 'area', spacing: [12,0,12,0], styledMode: true },
    title: { text: 'Mentions per week', align: 'left', margin: 28 },
    subtitle: { text: '' as any, align: 'left' },
    credits: { enabled: false },
    xAxis: { type: 'datetime', tickInterval: 7 * 24 * 3600 * 1000 },
    yAxis: { visible: true, min: 0, tickAmount: 8, title: { text: '' } },
    legend: { enabled: false },
    tooltip: {
      shared: true,
      formatter: function (this: Highcharts.Point & { points?: Highcharts.Point[] }) {
        const x = Number(this.x);
        const start = new Date(x);
        const end = new Date(x + 6 * 24 * 3600 * 1000);
        const fmt = (d: Date) =>
          `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        return `Week: ${fmt(start)} – ${fmt(end)}<br/>Mentions: <b>${this.y}</b>`;
      },
      style:{ color: '#FFFFFF', fontSize:'1em' }
    },
    lang: { noData: 'No data to show' },
    series: [{
      type: 'area',
      name: 'Mentions',
      data: [],
      lineWidth: 1,
      color: this.line,
      fillColor: this.area,
      marker: { enabled: false }
    }]
  };

  onChartInstance(chart: Highcharts.Chart) {
    this.chart = chart;
    chart.update({ lang: { loading: 'Loading…' } }, false);
    chart.showLoading();
  }

  async ngOnInit() {
    if (!this.isBrowser) return;

    try {
      const dates = await this.supabase.getAllPublishDates();
      if (dates.length === 0) {
        (this.chart as any)?.showNoData?.('No data to show');
        return;
      }

      const parsedUTC = dates
        .map(s => new Date(s))
        .filter(d => !isNaN(d.getTime()))
        .map(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())))
        .sort((a, b) => a.getTime() - b.getTime());

      const first = parsedUTC[0];
      const last  = parsedUTC[parsedUTC.length - 1];

      const firstWeek = this.weekStartUTC(first);
      const lastWeek  = this.weekStartUTC(last);

      const weeklyCounts = new Map<number, number>();
      for (const d of parsedUTC) {
        const ws = this.weekStartUTC(d).getTime();
        weeklyCounts.set(ws, (weeklyCounts.get(ws) ?? 0) + 1);
      }

      const points: [number, number][] = [];
      const cursor = new Date(firstWeek.getTime());
      while (cursor.getTime() <= lastWeek.getTime()) {
        const ts = cursor.getTime();
        points.push([ts, weeklyCounts.get(ts) ?? 0]);
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      }

      const fmt = (d: Date) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;

      this.options = {
        ...this.options,
        subtitle: { text: `${fmt(first)} → ${fmt(last)} (weekly)`, align: 'left' } as any,
        series: [{
          type: 'area',
          name: 'Mentions',
          data: points,
          lineWidth: 1,
          color: this.line,
          fillColor: this.area,
          marker: { enabled: false }
        }],
        time: { timezone: 'UTC' }
      };

      if (points.length === 0) (this.chart as any)?.showNoData?.('No data to show');
      else (this.chart as any)?.hideNoData?.();
    } catch (e) {
      (this.chart as any)?.showNoData?.('Error loading data');
    } finally {
      this.chart?.hideLoading();
    }
  }

  private weekStartUTC(d: Date): Date {
    const wd = d.getUTCDay();
    const diff = (wd + 6) % 7;
    const ws = new Date(d.getTime());
    ws.setUTCDate(ws.getUTCDate() - diff);
    ws.setUTCHours(0,0,0,0);
    return ws;
  }
}
