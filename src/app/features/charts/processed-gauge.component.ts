import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as Highcharts from 'highcharts';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  standalone: true,
  selector: 'app-processed-gauge',
  imports: [CommonModule],
  template: `
    <div class="w-full h-full">
      <div
        #chartEl
        style="width:100%;height:100%;display:block;"
      ></div>
    </div>
  `
})
export class ProcessedGaugeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartEl', { static: false }) chartEl!: ElementRef<HTMLDivElement>;

  private chart: Highcharts.Chart | null = null;
  private isBrowser = false;
  private ro: ResizeObserver | null = null;

  private seriesData: Highcharts.PointOptionsObject[] = [];
  private subtitleText = 'No data';
  private colors = ['#0072bc', '#abb3b8'];

  constructor(
    private supabase: SupabaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    try {
      const { total, processed } = await this.supabase.getProcessedAndTotal();
      const notProcessed = Math.max((total || 0) - (processed || 0), 0);

      this.seriesData = [
        { name: 'Processed', y: processed || 0, color: this.colors[0] },
        { name: 'Not processed', y: notProcessed, color: this.colors[1] }
      ];

      const pct = total > 0 ? Number((((processed ?? 0) / total) * 100).toFixed(2)) : 0;
      this.subtitleText = total > 0
        ? `Processed • ${pct}% (${processed}/${total})`
        : 'No data';
    } catch {
      this.seriesData = [
        { name: 'Processed', y: 0, color: this.colors[0] },
        { name: 'Not processed', y: 0, color: this.colors[1] }
      ];
      this.subtitleText = 'No data';
    }

    this.renderIfReady();
  }

  ngAfterViewInit() {
    this.renderIfReady();

    if (this.isBrowser && this.chartEl?.nativeElement) {
      this.ro = new ResizeObserver(() => {
        if (this.chart) this.chart.reflow();
      });
      this.ro.observe(this.chartEl.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.ro && this.chartEl?.nativeElement) {
      this.ro.unobserve(this.chartEl.nativeElement);
      this.ro.disconnect();
      this.ro = null;
    }
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private renderIfReady() {
    if (!this.isBrowser || !this.chartEl) return;

    const options: Highcharts.Options = {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        reflow: true,
        height: null,
        styledMode: true
      },
      title: { text: 'Processed', align: 'left', margin: 28 },
      subtitle: { text: this.subtitleText },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: { pointFormat: '{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
      plotOptions: {
        pie: {
          innerSize: '70%',
          size: '90%',
          borderRadius: 0,
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            distance: 12,
            style: { textOutline: 'none' },
            formatter: function (this: any) {
              const p = this.point as any;
              const pct = typeof p.percentage === 'number' ? p.percentage : 0;
              return `${p.name}: ${p.y} (${pct.toFixed(1)}%)`;
            }
          },
          showInLegend: false
        }
      },
      series: [{
        type: 'pie',
        name: 'Count',
        data: this.seriesData
      }]
    };

    if (this.chart) {
      this.chart.update(options, true, true);
    } else {
      this.chart = Highcharts.chart(this.chartEl.nativeElement, options);
    }
  }
}
