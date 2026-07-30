import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface AuthUser {
  name: string;
  role: string;
  nationalId: string;
  email: string;
  phoneNumber?: string;
  imageUrl?: string;
  accountNumber?: string;
  token?: string;
}


@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = `${environment.apiUrl}/auth`;

  private userKey = 'auth_user';
  private tokenKey = 'auth_token';

  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.getStoredUser();
      if (user) this.userSubject.next(user);
    }
  }

  /** ================= LOGIN ================= */
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  setSession(user: AuthUser) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, user.token || '');
    this.userSubject.next(user);
  }

  /** ================= CURRENT USER ================= */
  getCurrentUser(): AuthUser | null {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  private getStoredUser(): AuthUser | null {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  /** ================= ROLE ================= */
  getRole(): string {
    return this.getCurrentUser()?.role || '';
  }

  getToken(): string {
    return localStorage.getItem(this.tokenKey) || '';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.clear();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  /** ================= COMPATIBILITY HELPERS ================= */

getUser(): AuthUser | null {
  return this.getCurrentUser();
}

getNationalId(): string {
  return this.getCurrentUser()?.nationalId || '';
}

getUsername(): string {
  return this.getCurrentUser()?.name || '';
}

/** ================= OTP (restore missing methods) ================= */

verifyOtp(email: string, otp: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/verify-otp`, { email, otp });
}

sendOtp(phoneNumber: string, email: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/send-otp`, { phoneNumber, email });
}

/** ================= OPTIONAL ================= */

register(payload: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/register`, payload);
}

getLoggedInUser(): Observable<AuthUser> {
  const user = this.getCurrentUser();

  if (user) {
    return of(user);
  }

  return this.http.get<AuthUser>(`${this.baseUrl}/me`, {
    headers: {
      Authorization: `Bearer ${this.getToken()}`
    }
  });
}


/** Safely resolves user from memory OR storage */
resolveCurrentUser(): AuthUser | null {
  // 1. try BehaviorSubject (fastest + reliable after login)
  const cached = this.userSubject.value;
  if (cached) return cached;

  // 2. fallback to localStorage
  const stored = localStorage.getItem(this.userKey);
  if (stored) {
    const user = JSON.parse(stored);
    this.userSubject.next(user); // rehydrate memory
    return user;
  }

  return null;
}


resetPassword(data: any) {

    return this.http.post(

        this.baseUrl + '/forgot-password',

        data

    );

}

verifyAccount(email: string, accountNumber: string) {
  return this.http.post(
    `${this.baseUrl}/verify-account`,
    {
      email,
      accountNumber
    }
  );
}

}