import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Mention } from '../../core/services/supabase.service';

@Component({
  selector: 'app-full-content',
  templateUrl: './full-content.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class FullContentComponent implements OnInit {
  mention: Mention | null = null;
  editableMention: Mention | null = null;
  isLoading = true;
  isEditing = false;
  isProcessing = false;
  isResolving = false;

  alert: string = 'info';
  message: string = '';
  procesadoResultado: any = null;

  replyText: string = '';
  tweetId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mention = await this.supabaseService.getMentionById(Number(id));
      if (this.mention?.Link) {
        const match = this.mention.Link.match(/status\/(\d+)/);
        this.tweetId = match ? match[1] : null;
      }
      this.replyText = this.mention?.Justification || '';
    }
    this.isLoading = false;
  }

  getReplyHref(): string | null {
    if (!this.tweetId) return null;
    return `https://x.com/intent/tweet?in_reply_to=${this.tweetId}&text=${encodeURIComponent(this.replyText || '')}`;
  }

  async openReply(event: Event) {
    event.preventDefault();
    const url = this.getReplyHref();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
    const modalEl = document.getElementById('replyXDialog');
    const bs = (window as any).bootstrap;
    if (modalEl && bs?.Modal?.getOrCreateInstance) {
      bs.Modal.getOrCreateInstance(modalEl).hide();
    } else {
      const $ = (window as any)['$'];
      if (modalEl && $?.fn?.modal) {
        $(modalEl).modal('hide');
      }
    }
    if (this.mention && this.mention.Resolved !== true) {
      const ok = await this.supabaseService.setResolved(this.mention.id, true);
      if (ok) {
        this.mention = { ...this.mention, Resolved: true };
        this.alert = 'success';
        this.message = 'Reply sent. Marked as resolved.';
      } else {
        this.alert = 'warning';
        this.message = 'Reply sent, but it could not be marked as resolved.';
      }
    }
  }

  async toggleResolved() {
    if (!this.mention || this.isResolving) return;
    this.isResolving = true;
    const next = !Boolean(this.mention.Resolved);
    const ok = await this.supabaseService.setResolved(this.mention.id, next);
    if (ok) {
      this.mention = { ...this.mention, Resolved: next };
      this.alert = 'success';
      this.message = next ? 'Marked as resolved.' : 'Marked as unresolved.';
    } else {
      this.alert = 'danger';
      this.message = 'Error updating resolved state.';
    }
    this.isResolving = false;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  startEdit() {
    this.isEditing = true;
    this.editableMention = JSON.parse(JSON.stringify(this.mention));
    this.message = '';
  }

  cancelEdit() {
    this.isEditing = false;
    this.editableMention = null;
    this.message = '';
  }

  async saveChanges() {
    if (!this.editableMention) return;
    const success = await this.supabaseService.updateMention(
      this.editableMention.id,
      this.editableMention
    );

    if (success) {
      this.mention = this.editableMention;
      this.isEditing = false;
      this.message = 'Changes saved successfully.';
      this.alert = 'success';
    } else {
      this.message = 'Error saving changes.';
      this.alert = 'danger';
    }
  }

  async deleteMention() {
    if (!this.mention) return;
    const confirmed = confirm('Are you sure you want to remove this mention?');
    if (!confirmed) return;
    const success = await this.supabaseService.deleteMention(this.mention.id);
    if (success) {
      alert('Mention successfully removed.');
      this.router.navigate(['/']);
    } else {
      alert('Error deleting mention.');
    }
  }

  async processMention() {
    if (!this.mention || this.isProcessing) return;
    this.isProcessing = true;
    try {
      const response = await fetch('https://prototypepocvertexdisinformation-vertex.app.dev.techhubnttdata.com/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'e4b1c2a7-9f3d-4e2a-8c6a-5b7d2e1f4a3b',
        },
        body: JSON.stringify({ statement: this.mention.Detail })
      });
      if (!response.ok) throw new Error('Error in the request');
      const result = await response.json();
      const updatedMention = {
        ...this.mention,
        Processed: true,
        Classification: result.classification,
        Justification: result.justification
      };
      const success = await this.supabaseService.updateMention(this.mention.id, updatedMention);
      if (success) {
        this.mention = updatedMention;
        this.alert = 'success';
        this.message = 'Processed successfully.';
        this.replyText = this.mention?.Justification || '';
      } else {
        this.alert = 'warning';
        this.message = 'The "processed" state could not be saved.';
      }
    } catch (error) {
      console.error(error);
      this.alert = 'danger';
      this.message = 'Error processing mention.';
    } finally {
      this.isProcessing = false;
    }
  }

  getTagsArray(tags: string | null): string[] {
    if (!tags) return [];
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
}
