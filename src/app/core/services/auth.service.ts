import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  public isLoggedIn = new BehaviorSubject<boolean>(false);

  login(email: string, password: string): Observable<any> {
    const fakeToken = 'fake-token-' + email;
    return of({ token: fakeToken }).pipe(
      tap((res: { token: string }) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.tokenKey, res.token);
        }
        this.isLoggedIn.next(true);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.isLoggedIn.next(false);
  }
}
