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
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-resolved-gauge',
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
export class ResolvedGaugeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartEl', { static: false }) chartEl!: ElementRef<HTMLDivElement>;

  private chart: Highcharts.Chart | null = null;
  private isBrowser = false;
  private ro: ResizeObserver | null = null;

  private seriesData: Highcharts.PointOptionsObject[] = [];
  private subtitleText = 'No data';
  private colors = ['#2E7D32', '#ABB3B8'];

  constructor(
    private supabaseSvc: SupabaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    const { total, resolved } = await this.countResolvedWithFallback();
    const notResolved = Math.max(total - resolved, 0);

    this.seriesData = [
      { name: 'Resolved', y: resolved, color: this.colors[0] },
      { name: 'Not resolved', y: notResolved, color: this.colors[1] }
    ];

    this.subtitleText = total > 0
      ? `${resolved} resolved • ${notResolved} not resolved`
      : 'No data';

    this.renderIfReady();
  }

  ngAfterViewInit() {
    this.renderIfReady();
    if (this.isBrowser && this.chartEl?.nativeElement) {
      this.ro = new ResizeObserver(() => { if (this.chart) this.chart.reflow(); });
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

  private async countResolvedWithFallback(): Promise<{ total: number; resolved: number }> {
    try {
      const supa = createClient(environment.supabaseUrl, environment.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const table = environment.dbName;
      const totalRes = await supa.from(table).select('id', { count: 'exact', head: true });
      const total = totalRes.count ?? 0;
      const resolvedRes = await supa.from(table).select('id', { count: 'exact', head: true }).eq('Resolved', true);

      if (!resolvedRes.error) {
        return { total, resolved: resolvedRes.count ?? 0 };
      }
      const { total: t2, processed } = await this.supabaseSvc.getProcessedAndTotal();
      return { total: t2, resolved: processed };
    } catch {
      return { total: 0, resolved: 0 };
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
      title: { text: 'Resolved', align: 'left', margin: 28 },
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
