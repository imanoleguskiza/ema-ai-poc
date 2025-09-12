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
  selector: 'app-media-type-gauge',
  imports: [CommonModule],
  template: `
    <div class="w-100 h-100">
      <div
        #chartEl
        style="width:100%;height:100%;display:block;"
      ></div>
    </div>
  `
})
export class MediaTypeGaugeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartEl', { static: false }) chartEl!: ElementRef<HTMLDivElement>;

  private chart: Highcharts.Chart | null = null;
  private isBrowser = false;
  private ro: ResizeObserver | null = null;

  private seriesData: Highcharts.PointOptionsObject[] = [];
  private subtitleText = 'No data';

  constructor(
    private supabase: SupabaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    const rows = await this.supabase.getCountsByMediaType();
    const total = rows.reduce((s, r) => s + (r.y || 0), 0);
    this.seriesData = rows.map(r => ({ name: r.name || 'N/A', y: r.y || 0 }));

    const top = rows.reduce((a, b) => (a.y >= b.y ? a : b), { name: 'N/A', y: 0 });
    this.subtitleText = total > 0 ? 'Mentions sources' : 'No data';

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
      title: { text: 'Media type', align: 'left', margin: 28 },
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
