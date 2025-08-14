import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Mention } from '../../core/services/supabase.service';

declare var $: any;

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})

export class DashboardComponent implements OnInit {

  mentions: Mention[] = [];
  newMention: Partial<Mention> = {};

  pageSize = 1000;
  currentPage = 1;
  totalPages = 1;
  totalRows = 0;
  totalPagesArray: number[] = [];

  filters = {
    mediaType: '',
    classification: '',
    processed: ''
  };

  mediaTypes: string[] = [];
  classifications: string[] = [];

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';


  constructor(
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  get startItem(): number {
    return this.totalRows === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalRows ? this.totalRows : end;
  }

  async ngOnInit(): Promise<void> {
    await this.applyFilters();
  }

  async getTotalCount() {
    const { count, error } = await this.supabaseService.getMentionCount();
    if (error) {
      console.error('Error getting the total:', error);
      this.totalRows = 0;
      this.totalPages = 1;
    } else {
      this.totalRows = count || 0;
      this.totalPages = Math.ceil(this.totalRows / this.pageSize);
      this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
  }

  originalMentions: Mention[] = [];

  async loadPage(page: number) {
    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;

    this.currentPage = page;

    const { data, error } = await this.supabaseService.getMentionsFiltered(
      from, to,
      this.filters,
      this.sortColumn,
      this.sortDirection
    );

    if (error) {
      console.error('Error loading page:', error);
      this.mentions = [];
    } else {
      this.mentions = data || [];
      this.extractUniqueValues(); // útil para rellenar select de filtros
    }
  }


  async applyFilters() {
    this.currentPage = 1;

    const { count, error } = await this.supabaseService.getFilteredCount(this.filters);
    if (error) {
      console.error('Error getting filtered count:', error);
      this.totalRows = 0;
      this.totalPages = 1;
      this.totalPagesArray = [1];
    } else {
      this.totalRows = count;
      this.totalPages = Math.ceil(this.totalRows / this.pageSize);
      this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    await this.loadPage(this.currentPage);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadPage(this.currentPage);
  }

  extractUniqueValues() {
    const mediaSet = new Set<string>();
    const classifSet = new Set<string>();

    for (const m of this.mentions) {
      if (m['Media type']) mediaSet.add(m['Media type']);
      if (m.Classification) classifSet.add(m.Classification);
    }

    this.mediaTypes = Array.from(mediaSet).sort();
    this.classifications = Array.from(classifSet).sort();
  }


  previousPage() {
    if (this.currentPage > 1) this.loadPage(this.currentPage - 1);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.loadPage(this.currentPage + 1);
  }

  goToPage(page: number) {
    this.loadPage(page);
  }

  async loadThings() {
    this.mentions = await this.supabaseService.getMentions();
  }

  openModal() {
    $(document).basecoat();
    this.newMention = {}; // limpia el formulario
    $('#mentionModal').modal('show');
  }

  async createMention() {
    const nextId = await this.supabaseService.getNextMentionId();

    const mentionWithId = {
      id: nextId,
      ...this.newMention
    };

    const created = await this.supabaseService.createMention(mentionWithId);

    if (created) {
      $('#mentionModal').modal('hide');
      this.mentions = await this.supabaseService.getMentions();
      this.router.navigate(['/full-content', created.id]);
    } else {
      alert('❌ Error creating mention. Check console.');
    }
  }


  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  trackById(index: number, item: Mention) {
    return item.id;
  }

}

