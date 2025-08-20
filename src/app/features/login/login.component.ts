import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs/operators'; // 👈 importa finalize

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(form: NgForm) {
    if (this.loading || form.invalid) return;

    this.error = '';
    this.loading = true;

    this.auth.login(this.email.trim(), this.password)
      .pipe(finalize(() => {            // 👈 siempre se ejecuta
        this.loading = false;           //    re-habilita el botón
      }))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (e) => {
          this.error = e?.message || 'Login error';
          // opcional: limpiar password tras fallo
          this.password = '';
        }
      });
  }
}
