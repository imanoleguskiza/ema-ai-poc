import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  isLoggedIn$ = this.auth.isLoggedIn.asObservable();

  constructor(private auth: AuthService, private router: Router) {}

  goLogin() {
    this.router.navigate(['/login']);
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }


}
