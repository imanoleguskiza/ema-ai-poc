import { Component, OnInit, Input, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  standalone: true,
  selector: 'app-mentions-counter-banner',
  imports: [CommonModule],
  template: `
  <span class="banner-counter" *ngIf="isBrowser">
        <span class="counter-value" [attr.aria-live]="'polite'">
          {{ formattedDisplayCount }}
        </span>
  </span>
  `
})
export class MentionsCounterBannerComponent implements OnInit {

  private supabase = inject(SupabaseService);
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  loading = true;
  total = 0;
  displayCount = 0;

  private numberFmt = new Intl.NumberFormat(undefined);
  get formattedDisplayCount() { return this.numberFmt.format(Math.round(this.displayCount)); }

  ngOnInit() {
    if (this.isBrowser) this.refresh();
  }

  async refresh() {
    this.loading = true;
    try {
      const { count, error } = await this.supabase.getMentionCount();
      if (error) {
        console.error('getMentionCount error:', error);
        this.animateTo(0, 600);
      } else {
        this.total = count ?? 0;
        this.animateTo(this.total, this.durationMs);
      }
    } catch (e) {
      console.error('MentionsCounterBanner load error:', e);
    } finally {
      this.loading = false;
    }
  }

  @Input() durationMs = 3000;

  private animateTo(target: number, duration = 1000) {
    const start = performance.now();
    const from = this.displayCount;
    const delta = target - from;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.displayCount = from + delta * easeOutCubic(t);
      if (t < 1) requestAnimationFrame(tick);
      else this.displayCount = target;
    };
    requestAnimationFrame(tick);
  }
}
