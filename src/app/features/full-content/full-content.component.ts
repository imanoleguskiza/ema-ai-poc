import { Component, OnInit, } from '@angular/core';
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
  alert: string = 'info';
  message: string = '';
  procesadoResultado: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mention = await this.supabaseService.getMentionById(Number(id));
    }
    this.isLoading = false;
  }

  goBack() {
    this.router.navigate(['/']);
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
      this.message = '✅ Changes saved successfully.';
    } else {
      this.message = '❌ Error saving changes.';
    }
  }

  async deleteMention() {
    if (!this.mention) return;

    const confirmed = confirm('Are you sure you want to remove this mention?');
    if (!confirmed) return;

    const success = await this.supabaseService.deleteMention(this.mention.id);
    if (success) {
      alert('✅ Mention successfully removed.');
      this.router.navigate(['/']);
    } else {
      alert('❌ Error deleting mention.');
    }
  }

  async processMention() {
    if (!this.mention) return;

    try {
      const response = await fetch('https://prototypepocfightingdisinformation-vertex.app.dev.techhubnttdata.com/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'e4b1c2a7-9f3d-4e2a-8c6a-5b7d2e1f4a3b',
        },
        body: JSON.stringify({ id: this.mention.Detail })
      });

      if (!response.ok) throw new Error('Error in the request');

      const result = await response.json();

      console.log(result);

      // // 2. Actualizar la mención en Supabase con los datos de la respuesta
      // const updatedMention = {
      //   ...this.mention,
      //   Processed: true, // ⚠️ Asegurate de que el campo exista en tu tabla
      //   // otros campos que quieras actualizar desde `result`
      // };

      // const success = await this.supabaseService.updateMention(this.mention.id, updatedMention);

      // if (success) {
      //   this.mention = updatedMention;
      //   this.alert = 'success';
      //   this.message = '✅ Processed successfully.';
      // } else {
      //   this.message = '❌ The "processed" state could not be saved.';
      // }
    } catch (error) {
      console.error(error);
      this.alert = 'danger';
      this.message = 'Error processing mention.';
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

