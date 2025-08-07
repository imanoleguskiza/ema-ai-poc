import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Mention } from '../../core/services/supabase.service';

@Component({
  selector: 'app-full-content',
  templateUrl: './full-content.component.html',
  standalone: true,
  imports: [FormsModule],
})
export class FullContentComponent implements OnInit {
  mention: Mention | null = null;
  editableMention: Mention | null = null;
  isLoading = true;
  isEditing = false;
  message: string = '';

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
    // Clonamos el objeto original
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
      this.message = '✅ Cambios guardados correctamente.';
    } else {
      this.message = '❌ Error al guardar los cambios.';
    }
  }

  async deleteMention() {
    if (!this.mention) return;

    const confirmed = confirm('¿Estás seguro de que querés eliminar esta mención?');
    if (!confirmed) return;

    const success = await this.supabaseService.deleteMention(this.mention.id);
    if (success) {
      alert('✅ Mención eliminada correctamente.');
      this.router.navigate(['/']);
    } else {
      alert('❌ Error al eliminar la mención.');
    }
  }

}

