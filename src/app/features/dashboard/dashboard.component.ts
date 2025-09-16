import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SupabaseService, Mention, Topic } from '../../core/services/supabase.service';
import { MediaTypeGaugeComponent } from '../charts/media-type-gauge.component';
import { ClassificationGaugeComponent } from '../charts/classification-gauge.component';
import { ProcessedGaugeComponent } from '../charts/processed-gauge.component';
import { MentionsCounterBannerComponent } from '../charts/mentions-counter-banner.component';
import { MentionsTimelineWeeklyComponent } from '../charts/mentions-timeline-weekly.component';
import { ResolvedGaugeComponent } from '../charts/resolved-gauge.component';
import { environment } from '../../environments/environment';

declare var $: any;

type SortDir = 'asc' | 'desc';

type DashboardConfig = {
  topic: Topic;
  charts: {
    overview: boolean;
    processed: boolean;
    mediaType: boolean;
    resolved: boolean;
    classification: boolean;
  };
  tables: {
    processedPendingResolved: boolean;
    processedNA: boolean;
    unprocessed: boolean;
  };
  showNewMentionButton: boolean;
};

const DEFAULT_CONFIG: DashboardConfig = {
  topic: 'Ibuprofen',
  charts: {
    overview: true,
    processed: true,
    mediaType: true,
    resolved: true,
    classification: true
  },
  tables: {
    processedPendingResolved: true,
    processedNA: true,
    unprocessed: true
  },
  showNewMentionButton: true
};

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
  processedNA: Mention[] = [];
  unprocessed: Mention[] = [];
  newMention: Partial<Mention> = {};
  pageSize = 1000;

  pPage = 1;
  pTotalPages = 1;
  pTotalRows = 0;
  pPages: number[] = [];
  isLoadingProcessed = false;
  pSort = { column: 'id', dir: 'asc' as SortDir };

  naPage = 1;
  naTotalPages = 1;
  naTotalRows = 0;
  naPages: number[] = [];
  isLoadingNA = false;
  naSort = { column: 'id', dir: 'asc' as SortDir };

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
  selectedNA: Record<number, boolean> = {};
  selectedUnprocessed: Record<number, boolean> = {};
  allProcessedSelected = false;
  allNASelected = false;
  allUnprocessedSelected = false;

  processingProcessed = false;
  processingNA = false;
  processingUnprocessed = false;
  deletingProcessed = false;
  deletingNA = false;
  deletingUnprocessed = false;

  deleteModalOpen = false;
  deleteModalContext: 'processed' | 'processedNA' | 'unprocessed' | null = null;

  config: DashboardConfig = DEFAULT_CONFIG;
  workingConfig: DashboardConfig = { ...DEFAULT_CONFIG };
  configModalOpen = false;

  chartsMount = true;

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
  get naStartItem(): number {
    return this.naTotalRows === 0 ? 0 : (this.naPage - 1) * this.pageSize + 1;
  }
  get naEndItem(): number {
    const end = this.naPage * this.pageSize;
    return end > this.naTotalRows ? this.naTotalRows : end;
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
  get selectedNACount(): number {
    return Object.values(this.selectedNA).filter(Boolean).length;
  }
  get selectedUnprocessedCount(): number {
    return Object.values(this.selectedUnprocessed).filter(Boolean).length;
  }

  async ngOnInit(): Promise<void> {
    this.loadConfig();
    this.applyTopicToService(this.config.topic);
    this.pDebounce$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.reloadAllProcessed());
    this.uDebounce$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.uReloadAll());
    await Promise.all([this.reloadAllProcessed(), this.uReloadAll()]);
  }

  private pSignature(): string {
    return JSON.stringify({ pf: this.pf, sort: this.pSort, naSort: this.naSort });
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

  async reloadAllProcessed() {
    this.pPage = 1;
    this.naPage = 1;
    await Promise.all([this.pRefreshCount(), this.naRefreshCount()]);
    await Promise.all([this.pLoadPage(this.pPage), this.naLoadPage(this.naPage)]);
  }

  async pRefreshCount() {
    const { count } = await this.supabaseService.getFilteredCountV2({
      baseProcessed: true,
      mediaType: this.pf.mediaType,
      classificationNot: 'Not applicable',
      resolvedNullOrFalse: true,
      tagTerm: this.pf.tagTerm,
      titleTerm: this.pf.titleTerm
    });
    this.pTotalRows = count || 0;
    this.pTotalPages = Math.max(1, Math.ceil(this.pTotalRows / this.pageSize));
    this.pPages = Array.from({ length: this.pTotalPages }, (_, i) => i + 1);
  }

  async naRefreshCount() {
    const { count } = await this.supabaseService.getFilteredCountV2({
      baseProcessed: true,
      mediaType: this.pf.mediaType,
      classification: 'Not applicable',
      tagTerm: this.pf.tagTerm,
      titleTerm: this.pf.titleTerm
    });
    this.naTotalRows = count || 0;
    this.naTotalPages = Math.max(1, Math.ceil(this.naTotalRows / this.pageSize));
    this.naPages = Array.from({ length: this.naTotalPages }, (_, i) => i + 1);
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
        classificationNot: 'Not applicable',
        resolvedNullOrFalse: true,
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

  async naLoadPage(page: number) {
    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;
    this.naPage = page;
    this.isLoadingNA = true;
    const { data } = await this.supabaseService.getMentionsFilteredV2(
      from,
      to,
      {
        baseProcessed: true,
        mediaType: this.pf.mediaType,
        classification: 'Not applicable',
        tagTerm: this.pf.tagTerm,
        titleTerm: this.pf.titleTerm
      },
      this.naSort.column,
      this.naSort.dir
    );
    this.processedNA = data || [];
    this.resetNASelection();
    this.isLoadingNA = false;
  }

  async uReloadAll() {
    this.uPage = 1;
    await this.uRefreshCount();
    await this.uLoadPage(this.uPage);
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

  naPrev() { if (!this.isLoadingNA && this.naPage > 1) this.naLoadPage(this.naPage - 1); }
  naNext() { if (!this.isLoadingNA && this.naPage < this.naTotalPages) this.naLoadPage(this.naPage + 1); }
  naGo(p: number) { if (!this.isLoadingNA) this.naLoadPage(p); }

  uPrev() { if (!this.isLoadingUnprocessed && this.uPage > 1) this.uLoadPage(this.uPage - 1); }
  uNext() { if (!this.isLoadingUnprocessed && this.uPage < this.uTotalPages) this.uLoadPage(this.uPage + 1); }
  uGo(p: number) { if (!this.isLoadingUnprocessed) this.uLoadPage(p); }

  sortProcessedBy(col: string) {
    if (this.pSort.column === col) this.pSort.dir = this.pSort.dir === 'asc' ? 'desc' : 'asc';
    else { this.pSort.column = col; this.pSort.dir = 'asc'; }
    this.applyProcessedFilters();
  }

  sortNABy(col: string) {
    if (this.naSort.column === col) this.naSort.dir = this.naSort.dir === 'asc' ? 'desc' : 'asc';
    else { this.naSort.column = col; this.naSort.dir = 'asc'; }
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
    $(document).basecoat?.();
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
      await Promise.all([this.reloadAllProcessed(), this.uReloadAll()]);
    } else {
      alert('Error creating mention.');
    }
  }

  async bulkDelete(forKey: 'processed' | 'processedNA' | 'unprocessed') {
    if (forKey === 'processed') this.deletingProcessed = true;
    else if (forKey === 'processedNA') this.deletingNA = true;
    else this.deletingUnprocessed = true;

    const ids = forKey === 'processed'
      ? this.getSelectedIds(this.selectedProcessed)
      : forKey === 'processedNA'
        ? this.getSelectedIds(this.selectedNA)
        : this.getSelectedIds(this.selectedUnprocessed);

    for (const id of ids) {
      await this.supabaseService.deleteMention(id);
    }

    if (forKey === 'processed') this.deletingProcessed = false;
    else if (forKey === 'processedNA') this.deletingNA = false;
    else this.deletingUnprocessed = false;

    await Promise.all([this.reloadAllProcessed(), this.uReloadAll()]);
  }

  async bulkProcessAI(forKey: 'processed' | 'processedNA' | 'unprocessed') {
    if (forKey === 'processed') this.processingProcessed = true;
    else if (forKey === 'processedNA') this.processingNA = true;
    else this.processingUnprocessed = true;

    const ids = forKey === 'processed'
      ? this.getSelectedIds(this.selectedProcessed)
      : forKey === 'processedNA'
        ? this.getSelectedIds(this.selectedNA)
        : this.getSelectedIds(this.selectedUnprocessed);

    for (const id of ids) {
      const list = forKey === 'processed' ? this.processed : forKey === 'processedNA' ? this.processedNA : this.unprocessed;
      const m = list.find(x => x.id === id);
      if (!m) continue;
      try {
        const res = await fetch(environment.verifyApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': environment.verifyApiKey },
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

    if (forKey === 'processed') this.processingProcessed = false;
    else if (forKey === 'processedNA') this.processingNA = false;
    else this.processingUnprocessed = false;

    await Promise.all([this.reloadAllProcessed(), this.uReloadAll()]);
  }

  openDeleteModal(ctx: 'processed' | 'processedNA' | 'unprocessed') {
    this.deleteModalContext = ctx;
    this.deleteModalOpen = true;
  }

  async confirmDelete() {
    if (this.deleteModalContext) {
      await this.bulkDelete(this.deleteModalContext);
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
    this.processed.forEach(m => (this.selectedProcessed[m.id] = checked));
    this.applyProcessedFilters();
  }
  toggleSelectAllNA(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.allNASelected = checked;
    this.processedNA.forEach(m => (this.selectedNA[m.id] = checked));
    this.applyProcessedFilters();
  }
  toggleSelectAllUnprocessed(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.allUnprocessedSelected = checked;
    this.unprocessed.forEach(m => (this.selectedUnprocessed[m.id] = checked));
    this.applyUnprocessedFilters();
  }

  syncAllProcessedSelected() {
    this.allProcessedSelected = this.processed.length > 0 && this.processed.every(m => this.selectedProcessed[m.id]);
  }
  syncAllNASelected() {
    this.allNASelected = this.processedNA.length > 0 && this.processedNA.every(m => this.selectedNA[m.id]);
  }
  syncAllUnprocessedSelected() {
    this.allUnprocessedSelected = this.unprocessed.length > 0 && this.unprocessed.every(m => this.selectedUnprocessed[m.id]);
  }

  resetProcessedSelection() {
    this.selectedProcessed = {};
    this.allProcessedSelected = false;
  }
  resetNASelection() {
    this.selectedNA = {};
    this.allNASelected = false;
  }
  resetUnprocessedSelection() {
    this.selectedUnprocessed = {};
    this.allUnprocessedSelected = false;
  }

  openConfigModal() {
    this.workingConfig = JSON.parse(JSON.stringify(this.config));
    this.configModalOpen = true;
    $('#configModal').modal('show');
  }
  closeConfigModal() {
    this.configModalOpen = false;
    $('#configModal').modal('hide');
  }
  async saveConfig() {
    const prevDb = this.supabaseService.dbname;
    this.config = JSON.parse(JSON.stringify(this.workingConfig));
    try {
      localStorage.setItem('dashboardConfig', JSON.stringify(this.config));
    } catch {}
    this.applyTopicToService(this.config.topic);
    this.configModalOpen = false;
    $('#configModal').modal('hide');
    const topicChanged = prevDb !== this.supabaseService.dbname;
    if (topicChanged) {
      this.chartsMount = false;
      await Promise.resolve();
      setTimeout(() => { this.chartsMount = true; }, 0);
      await Promise.all([this.reloadAllProcessed(), this.uReloadAll()]);
    }
  }
  loadConfig() {
    try {
      const raw = localStorage.getItem('dashboardConfig');
      if (raw) {
        const parsed = JSON.parse(raw) as DashboardConfig;
        this.config = {
          ...DEFAULT_CONFIG,
          ...parsed,
          charts: { ...DEFAULT_CONFIG.charts, ...(parsed.charts || {}) },
          tables: { ...DEFAULT_CONFIG.tables, ...(parsed.tables || {}) }
        };
      } else {
        this.config = { ...DEFAULT_CONFIG };
      }
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
  }
  private applyTopicToService(topic: Topic) {
    this.supabaseService.setTopic(topic);
  }

  toggleChart(key: 'overview' | 'processed' | 'mediaType' | 'resolved' | 'classification') {
    const next = { ...this.workingConfig.charts };
    next[key] = !next[key];
    this.workingConfig = { ...this.workingConfig, charts: next };
  }

  setTopic(t: Topic) {
    this.workingConfig = { ...this.workingConfig, topic: t };
  }

  toggleTable(key: 'processedPendingResolved' | 'processedNA' | 'unprocessed') {
    const next = { ...this.workingConfig.tables };
    next[key] = !next[key];
    this.workingConfig = { ...this.workingConfig, tables: next };
  }

  toggleNewMention() {
    this.workingConfig = { ...this.workingConfig, showNewMentionButton: !this.workingConfig.showNewMentionButton };
  }
}
