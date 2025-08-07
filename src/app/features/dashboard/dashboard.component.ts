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

  constructor(
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.getTotalCount();
    await this.loadPage(this.currentPage);
    // this.loadThings();
  }

    async getTotalCount() {
    const { count, error } = await this.supabaseService.getMentionCount();
    if (error) {
      console.error('Error obteniendo el total:', error);
      this.totalRows = 0;
      this.totalPages = 1;
    } else {
      this.totalRows = count || 0;
      this.totalPages = Math.ceil(this.totalRows / this.pageSize);
      this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
  }

    async loadPage(page: number) {
    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;

    this.currentPage = page;

    const { data, error } = await this.supabaseService.getMentionsPaged(from, to);
    if (error) {
      console.error('Error cargando página:', error);
      this.mentions = [];
    } else {
      this.mentions = data || [];
    }
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
    alert('❌ Error al crear la mención. Revisá consola.');
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

