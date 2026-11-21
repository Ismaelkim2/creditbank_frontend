
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
  userImageUrl?: string;
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
      if (user) {
        this.userSubject.next(user);
      }
    }
  }

  /** ================= LOGIN ================= */

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  setSession(user: AuthUser): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(this.userKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, user.token || '');

    this.userSubject.next(user);
  }

  /** ================= CURRENT USER ================= */

  getCurrentUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  private getStoredUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  /** ================= PROFILE IMAGE UPLOAD ================= */

  uploadProfileImage(file: File): Observable<any> {

    const formData = new FormData();
    formData.append('image', file);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    });

    return this.http.post(
      `${this.baseUrl}/profile-image`,
      formData,
      { headers }
    );
  }

  /**
   * Updates the locally stored profile photo after a successful upload.
   * Keeps the existing login token and other user information unchanged.
   */
  updateProfileImage(imageUrl: string): void {

    if (!isPlatformBrowser(this.platformId)) return;

    const currentUser = this.getCurrentUser();

    if (!currentUser) return;

    const updatedUser: AuthUser = {
      ...currentUser,
      userImageUrl: imageUrl,
      imageUrl: imageUrl
    };

    localStorage.setItem(
      this.userKey,
      JSON.stringify(updatedUser)
    );

    this.userSubject.next(updatedUser);
  }

  /** ================= ROLE ================= */

  getRole(): string {
    return this.getCurrentUser()?.role || '';
  }

  getToken(): string {
    if (!isPlatformBrowser(this.platformId)) return '';

    return localStorage.getItem(this.tokenKey) || '';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }

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

  /** ================= OTP ================= */

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/verify-otp`,
      { email, otp }
    );
  }

  sendOtp(phoneNumber: string, email: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/send-otp`,
      { phoneNumber, email }
    );
  }

  /** ================= REGISTRATION ================= */

  register(payload: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/register`,
      payload
    );
  }

  /** ================= LOGGED-IN USER ================= */

  getLoggedInUser(): Observable<AuthUser> {

    const user = this.getCurrentUser();

    if (user) {
      return of(user);
    }

    return this.http.get<AuthUser>(
      `${this.baseUrl}/me`,
      {
        headers: {
          Authorization: `Bearer ${this.getToken()}`
        }
      }
    );
  }

  /** ================= USER RESOLUTION ================= */

  resolveCurrentUser(): AuthUser | null {

    const cached = this.userSubject.value;

    if (cached) return cached;

    const stored = this.getStoredUser();

    if (stored) {
      this.userSubject.next(stored);
      return stored;
    }

    return null;
  }

  /** ================= PASSWORD RESET ================= */

  resetPassword(data: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/forgot-password`,
      data
    );
  }

  /** ================= ACCOUNT VERIFICATION ================= */

  verifyAccount(
    email: string,
    accountNumber: string
  ): Observable<any> {

    return this.http.post(
      `${this.baseUrl}/verify-account`,
      {
        email,
        accountNumber
      }
    );
  }

}
