import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SupabaseService, Mention } from '../../core/services/supabase.service';
import { MediaTypeGaugeComponent } from '../charts/media-type-gauge.component';
import { ClassificationGaugeComponent } from '../charts/classification-gauge.component';
import { ProcessedGaugeComponent } from '../charts/processed-gauge.component';
import { MentionsCounterBannerComponent } from '../charts/mentions-counter-banner.component';
import { MentionsTimelineWeeklyComponent } from '../charts/mentions-timeline-weekly.component';
import { ResolvedGaugeComponent } from '../charts/resolved-gauge.component';

declare var $: any;

type SortDir = 'asc' | 'desc';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MediaTypeGaugeComponent,
    ClassificationGaugeComponent,
    ProcessedGaugeComponent,
    MentionsCounterBannerComponent,
    MentionsTimelineWeeklyComponent,
    ResolvedGaugeComponent
  ],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  processed: Mention[] = [];
  unprocessed: Mention[] = [];
  newMention: Partial<Mention> = {};

  pageSize = 1000;

  pPage = 1;
  pTotalPages = 1;
  pTotalRows = 0;
  pPages: number[] = [];
  isLoadingProcessed = false;
  pSort = { column: 'id', dir: 'asc' as SortDir };

  uPage = 1;
  uTotalPages = 1;
  uTotalRows = 0;
  uPages: number[] = [];
  isLoadingUnprocessed = false;
  uSort = { column: 'id', dir: 'asc' as SortDir };

  pf = { mediaType: '', classification: '', resolved: '' as '' | boolean, tagTerm: '', titleTerm: '' };
  uf = { mediaType: '', tagTerm: '', titleTerm: '' };

  mediaTypesProcessed: string[] = [];
  classificationsProcessed: string[] = [];
  mediaTypesUnprocessed: string[] = [];

  selectedProcessed: Record<number, boolean> = {};
  selectedUnprocessed: Record<number, boolean> = {};
  allProcessedSelected = false;
  allUnprocessedSelected = false;

  processingProcessed = false;
  processingUnprocessed = false;
  deletingProcessed = false;
  deletingUnprocessed = false;

  deleteModalOpen = false;
  deleteModalContext: 'processed' | 'unprocessed' | null = null;

  private pDebounce$ = new Subject<string>();
  private uDebounce$ = new Subject<string>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  get pStartItem(): number {
    return this.pTotalRows === 0 ? 0 : (this.pPage - 1) * this.pageSize + 1;
  }
  get pEndItem(): number {
    const end = this.pPage * this.pageSize;
    return end > this.pTotalRows ? this.pTotalRows : end;
  }
  get uStartItem(): number {
    return this.uTotalRows === 0 ? 0 : (this.uPage - 1) * this.pageSize + 1;
  }
  get uEndItem(): number {
    const end = this.uPage * this.pageSize;
    return end > this.uTotalRows ? this.uTotalRows : end;
  }

  get selectedProcessedCount(): number {
    return Object.values(this.selectedProcessed).filter(Boolean).length;
  }
  get selectedUnprocessedCount(): number {
    return Object.values(this.selectedUnprocessed).filter(Boolean).length;
  }

  ngOnInit(): Promise<void> {
    this.pDebounce$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.pReloadAll());
    this.uDebounce$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.uReloadAll());
    return Promise.all([this.pReloadAll(), this.uReloadAll()]).then(() => undefined);
  }

  private pSignature(): string {
    return JSON.stringify({ pf: this.pf, sort: this.pSort });
  }
  private uSignature(): string {
    return JSON.stringify({ uf: this.uf, sort: this.uSort });
  }

  applyProcessedFilters() {
    this.pDebounce$.next(this.pSignature());
  }
  applyUnprocessedFilters() {
    this.uDebounce$.next(this.uSignature());
  }

  async pReloadAll() {
    this.pPage = 1;
    await this.pRefreshCount();
    await this.pLoadPage(this.pPage);
  }
  async uReloadAll() {
    this.uPage = 1;
    await this.uRefreshCount();
    await this.uLoadPage(this.uPage);
  }

  async pRefreshCount() {
    const { count } = await this.supabaseService.getFilteredCountV2({
      baseProcessed: true,
      mediaType: this.pf.mediaType,
      classification: this.pf.classification,
      resolved: this.pf.resolved === '' ? null : this.pf.resolved,
      tagTerm: this.pf.tagTerm,
      titleTerm: this.pf.titleTerm
    });
    this.pTotalRows = count || 0;
    this.pTotalPages = Math.max(1, Math.ceil(this.pTotalRows / this.pageSize));
    this.pPages = Array.from({ length: this.pTotalPages }, (_, i) => i + 1);
  }

  async uRefreshCount() {
    const { count } = await this.supabaseService.getFilteredCountV2({
      baseProcessed: false,
      mediaType: this.uf.mediaType,
      tagTerm: this.uf.tagTerm,
      titleTerm: this.uf.titleTerm
    });
    this.uTotalRows = count || 0;
    this.uTotalPages = Math.max(1, Math.ceil(this.uTotalRows / this.pageSize));
    this.uPages = Array.from({ length: this.uTotalPages }, (_, i) => i + 1);
  }

  async pLoadPage(page: number) {
    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;
    this.pPage = page;
    this.isLoadingProcessed = true;
    const { data } = await this.supabaseService.getMentionsFilteredV2(
      from,
      to,
      {
        baseProcessed: true,
        mediaType: this.pf.mediaType,
        classification: this.pf.classification,
        resolved: this.pf.resolved === '' ? null : this.pf.resolved,
        tagTerm: this.pf.tagTerm,
        titleTerm: this.pf.titleTerm
      },
      this.pSort.column,
      this.pSort.dir
    );
    this.processed = data || [];
    this.mediaTypesProcessed = this.extractDistinct(
      this.processed.map(m => m['Media type'] ?? '').filter(this.notEmptyString)
    );
    this.classificationsProcessed = this.extractDistinct(
      this.processed.map(m => m.Classification ?? '').filter(this.notEmptyString)
    );
    this.resetProcessedSelection();
    this.isLoadingProcessed = false;
  }

  async uLoadPage(page: number) {
    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;
    this.uPage = page;
    this.isLoadingUnprocessed = true;
    const { data } = await this.supabaseService.getMentionsFilteredV2(
      from,
      to,
      {
        baseProcessed: false,
        mediaType: this.uf.mediaType,
        tagTerm: this.uf.tagTerm,
        titleTerm: this.uf.titleTerm
      },
      this.uSort.column,
      this.uSort.dir
    );
    this.unprocessed = data || [];
    this.mediaTypesUnprocessed = this.extractDistinct(
      this.unprocessed.map(m => m['Media type'] ?? '').filter(this.notEmptyString)
    );
    this.resetUnprocessedSelection();
    this.isLoadingUnprocessed = false;
  }

  pPrev() { if (!this.isLoadingProcessed && this.pPage > 1) this.pLoadPage(this.pPage - 1); }
  pNext() { if (!this.isLoadingProcessed && this.pPage < this.pTotalPages) this.pLoadPage(this.pPage + 1); }
  pGo(p: number) { if (!this.isLoadingProcessed) this.pLoadPage(p); }

  uPrev() { if (!this.isLoadingUnprocessed && this.uPage > 1) this.uLoadPage(this.uPage - 1); }
  uNext() { if (!this.isLoadingUnprocessed && this.uPage < this.uTotalPages) this.uLoadPage(this.uPage + 1); }
  uGo(p: number) { if (!this.isLoadingUnprocessed) this.uLoadPage(p); }

  sortProcessedBy(col: string) {
    if (this.pSort.column === col) this.pSort.dir = this.pSort.dir === 'asc' ? 'desc' : 'asc';
    else { this.pSort.column = col; this.pSort.dir = 'asc'; }
    this.applyProcessedFilters();
  }

  sortUnprocessedBy(col: string) {
    if (this.uSort.column === col) this.uSort.dir = this.uSort.dir === 'asc' ? 'desc' : 'asc';
    else { this.uSort.column = col; this.uSort.dir = 'asc'; }
    this.applyUnprocessedFilters();
  }

  extractDistinct(arr: string[]): string[] {
    return Array.from(new Set(arr)).sort();
  }

  notEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

  openModal() {
    $(document).basecoat();
    this.newMention = {};
    $('#mentionModal').modal('show');
  }

  async createMention() {
    const nextId = await this.supabaseService.getNextMentionId();
    const mentionWithId = { id: nextId, ...this.newMention };
    const created = await this.supabaseService.createMention(mentionWithId);
    if (created) {
      $('#mentionModal').modal('hide');
      this.router.navigate(['/full-content', created.id]);
      await Promise.all([this.pReloadAll(), this.uReloadAll()]);
    } else {
      alert('Error creating mention.');
    }
  }

  async bulkDelete(forProcessed: boolean) {
    if (forProcessed) this.deletingProcessed = true; else this.deletingUnprocessed = true;
    const ids = forProcessed ? this.getSelectedIds(this.selectedProcessed) : this.getSelectedIds(this.selectedUnprocessed);
    for (const id of ids) {
      await this.supabaseService.deleteMention(id);
    }
    if (forProcessed) this.deletingProcessed = false; else this.deletingUnprocessed = false;
    await Promise.all([this.pReloadAll(), this.uReloadAll()]);
  }

  async bulkProcessAI(forProcessed: boolean) {
    if (forProcessed) this.processingProcessed = true; else this.processingUnprocessed = true;
    const ids = forProcessed ? this.getSelectedIds(this.selectedProcessed) : this.getSelectedIds(this.selectedUnprocessed);
    for (const id of ids) {
      const m = (forProcessed ? this.processed : this.unprocessed).find(x => x.id === id);
      if (!m) continue;
      try {
        const res = await fetch('https://prototypepocvertexdisinformation-vertex.app.dev.techhubnttdata.com/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': 'e4b1c2a7-9f3d-4e2a-8c6a-5b7d2e1f4a3b' },
          body: JSON.stringify({ statement: m.Detail || '' })
        });
        if (!res.ok) throw new Error('Request error');
        const result = await res.json();
        await this.supabaseService.updateMention(id, {
          Processed: true,
          Classification: result.classification,
          Justification: result.justification
        });
      } catch {}
    }
    if (forProcessed) this.processingProcessed = false; else this.processingUnprocessed = false;
    await Promise.all([this.pReloadAll(), this.uReloadAll()]);
  }

  openDeleteModal(ctx: 'processed' | 'unprocessed') {
    this.deleteModalContext = ctx;
    this.deleteModalOpen = true;
  }

  async confirmDelete() {
    if (this.deleteModalContext === 'processed') {
      await this.bulkDelete(true);
    } else if (this.deleteModalContext === 'unprocessed') {
      await this.bulkDelete(false);
    }
    this.deleteModalOpen = false;
    this.deleteModalContext = null;
  }

  cancelDelete() {
    this.deleteModalOpen = false;
    this.deleteModalContext = null;
  }

  getSelectedIds(map: Record<number, boolean>): number[] {
    return Object.keys(map).filter(k => map[+k]).map(k => +k);
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  trackById(index: number, item: Mention) {
    return item.id;
  }

  toggleSelectAllProcessed(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.allProcessedSelected = checked;
    this.processed.forEach(m => this.selectedProcessed[m.id] = checked);
    this.applyProcessedFilters();
  }
  toggleSelectAllUnprocessed(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.allUnprocessedSelected = checked;
    this.unprocessed.forEach(m => this.selectedUnprocessed[m.id] = checked);
    this.applyUnprocessedFilters();
  }
  syncAllProcessedSelected() {
    this.allProcessedSelected = this.processed.length > 0 && this.processed.every(m => this.selectedProcessed[m.id]);
  }
  syncAllUnprocessedSelected() {
    this.allUnprocessedSelected = this.unprocessed.length > 0 && this.unprocessed.every(m => this.selectedUnprocessed[m.id]);
  }
  resetProcessedSelection() {
    this.selectedProcessed = {};
    this.allProcessedSelected = false;
  }
  resetUnprocessedSelection() {
    this.selectedUnprocessed = {};
    this.allUnprocessedSelected = false;
  }

  uReloadPage() { this.uLoadPage(this.uPage); }
}
