import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

type AuthMode = 'mock' | 'api';
interface AuthResponse { token: string; user?: any; }
interface MockUser { id: string; email: string; password: string; createdAt: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly usersKey = 'mock_users';
  private readonly mode: AuthMode = environment.authMode;

  public readonly isLoggedIn = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.restore();
    if (this.mode === 'mock') this.seedUsersIfNeeded();
  }

  private hasStorage() {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }
  private get storage() {
    if (!this.hasStorage()) throw new Error('Storage not available on this platform');
    return localStorage;
  }

  private restore() {
    this.isLoggedIn.next(!!this.token);
  }
  get token(): string | null {
    return this.hasStorage() ? this.storage.getItem(this.tokenKey) : null;
  }
  private persistToken(token: string) {
    if (this.hasStorage()) this.storage.setItem(this.tokenKey, token);
    this.isLoggedIn.next(true);
  }
  logout(): void {
    if (this.hasStorage()) this.storage.removeItem(this.tokenKey);
    this.isLoggedIn.next(false);
  }
  hasSession(): boolean {
    return !!this.token;
  }

  login(email: string, password: string): Observable<void> {
    return this.mode === 'api'
      ? this.loginApi(email, password)
      : this.loginMock(email, password);
  }

  register(email: string, password: string): Observable<void> {
    return this.mode === 'api'
      ? this.registerApi(email, password)
      : this.registerMock(email, password);
  }

  private loginApi(email: string, password: string): Observable<void> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.persistToken(res.token)),
      map(() => void 0),
      catchError((err) => throwError(() => new Error(err?.error?.message || 'Login error')))
    );
  }
  private registerApi(email: string, password: string): Observable<void> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, { email, password }).pipe(
      map(() => void 0),
      catchError((err) => throwError(() => new Error(err?.error?.message || 'Register error')))
    );
  }

  private loadUsers(): MockUser[] {
    if (!this.hasStorage()) return [];
    const raw = this.storage.getItem(this.usersKey);
    return raw ? JSON.parse(raw) as MockUser[] : [];
  }
  private saveUsers(users: MockUser[]) {
    if (this.hasStorage()) this.storage.setItem(this.usersKey, JSON.stringify(users));
  }
  private seedUsersIfNeeded() {
    const existing = this.loadUsers();
    if (existing.length) return;
    const seeded = (environment.seedUsers || []).map<MockUser>(u => ({
      id: cryptoRandomId(),
      email: u.email.toLowerCase(),
      password: u.password,
      createdAt: Date.now()
    }));
    if (seeded.length) this.saveUsers(seeded);
  }

  private loginMock(email: string, password: string): Observable<void> {
    const users = this.loadUsers();
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user || user.password !== password) {
      return throwError(() => new Error('Invalid credentials'));
    }
    const fakeToken = `mock.${btoa(`${user.email}|${Date.now()}`)}`;
    return of({ token: fakeToken }).pipe(
      delay(200),
      tap(({ token }) => this.persistToken(token)),
      map(() => void 0)
    );
  }

  private registerMock(email: string, password: string): Observable<void> {
    const users = this.loadUsers();
    const exists = users.some(u => u.email === email.toLowerCase());
    if (exists) return throwError(() => new Error('User already exists'));
    const newUser: MockUser = {
      id: cryptoRandomId(),
      email: email.toLowerCase(),
      password,
      createdAt: Date.now()
    };
    users.push(newUser);
    this.saveUsers(users);
    return of(void 0);
  }
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2, 10);
}
