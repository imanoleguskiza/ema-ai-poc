import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isLoggedIn$ = this.auth.isLoggedIn.asObservable();

  constructor(private auth: AuthService, private router: Router) {}

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
